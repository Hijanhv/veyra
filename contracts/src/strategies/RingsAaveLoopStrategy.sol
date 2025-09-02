// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

import {BaseStrategy} from "../strategies/BaseStrategy.sol";
import {IRingsAdapter} from "../interfaces/adapters/IRingsAdapter.sol";
import {ILendingAdapter} from "../interfaces/adapters/ILendingAdapter.sol";

/// @title RingsAaveLoopStrategy
/// @notice Leveraged stablecoin strategy using Rings and Aave.
///         Takes USDC, mints scUSD through Rings, uses scUSD as collateral
///         on Aave to borrow more USDC, then loops until target health factor.
///         Withdrawals pay back debt and redeem scUSD to USDC
contract RingsAaveLoopStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IRingsAdapter public immutable rings;
    ILendingAdapter public immutable lending;
    address public immutable USDC;
    address public immutable scUSD;

    uint256 public targetHF;
    uint256 public maxIterations;

    /// @param _usdc USDC token address (what the vault holds)
    /// @param _vault The vault contract address
    /// @param _ringsAdapter Rings protocol adapter address
    /// @param _lendingAdapter Aave lending adapter address
    /// @param _targetHF Target health factor to maintain
    /// @param _maxIter Max loops for leveraging
    constructor(
        address _usdc,
        address _vault,
        address _ringsAdapter,
        address _lendingAdapter,
        uint256 _targetHF,
        uint256 _maxIter
    ) BaseStrategy(_usdc, _vault) {
        require(
            _ringsAdapter != address(0) && _lendingAdapter != address(0),
            "bad adapters"
        );
        require(_targetHF > 0, "bad HF");
        rings = IRingsAdapter(_ringsAdapter);
        lending = ILendingAdapter(_lendingAdapter);
        USDC = _usdc;
        scUSD = rings.scUSD();
        targetHF = _targetHF;
        maxIterations = _maxIter;
        IERC20(_usdc).approve(_ringsAdapter, type(uint256).max);
        IERC20(scUSD).approve(_lendingAdapter, type(uint256).max);
        IERC20(_usdc).approve(_lendingAdapter, type(uint256).max);
        // Let Rings adapter spend scUSD when we redeem it
        IERC20(scUSD).approve(_ringsAdapter, type(uint256).max);
    }

    /// @notice Deposit USDC, mint scUSD and leverage up until we hit target health factor
    function deposit(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero deposit");
        uint256 usdcBal = IERC20(USDC).balanceOf(address(this));
        require(usdcBal >= amount, "insufficient USDC");
        // Convert USDC to scUSD through Rings
        uint256 sc = rings.mint_scUSD(amount);
        // Use scUSD as collateral on Aave
        lending.deposit(scUSD, sc);
        // leverage loop: borrow USDC, mint more scUSD, deposit until we hit target health factor
        uint256 it;
        while (it < maxIterations) {
            uint256 hf = lending.healthFactor(address(this));
            if (hf <= targetHF) break;
            uint256 borrowAmt = _stepBorrow();
            if (borrowAmt == 0) break;
            lending.borrow(USDC, borrowAmt);
            uint256 moreSc = rings.mint_scUSD(borrowAmt);
            lending.deposit(scUSD, moreSc);
            it++;
        }
    }

    /// @notice Withdraw USDC back to vault. Uses free USDC first,
    ///         pays back debt if needed, redeems scUSD collateral
    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero withdraw");
        uint256 free = IERC20(USDC).balanceOf(address(this));
        if (free < amount) {
            uint256 needed = amount - free;
            // pay back debt using scUSD collateral
            uint256 debt = lending.debtOf(address(this), USDC);
            if (debt > 0) {
                uint256 scCol = lending.collateralOf(address(this), scUSD);
                uint256 toPull = scCol > needed ? needed : scCol;
                lending.withdraw(scUSD, toPull);
                uint256 redeemed = rings.redeem_scUSD(toPull);
                // pay back as much debt as we can
                lending.repay(USDC, redeemed > debt ? debt : redeemed);
            }
            // still need more USDC for the withdrawal
            uint256 stillNeed = amount - IERC20(USDC).balanceOf(address(this));
            if (stillNeed > 0) {
                // take out scUSD collateral and convert to USDC
                lending.withdraw(scUSD, stillNeed);
                rings.redeem_scUSD(stillNeed);
            }
        }
        IERC20(USDC).safeTransfer(vault, amount);
    }

    /// @notice Harvest yields. scUSD earns yield automatically,
    ///         so this just returns zero
    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        return 0;
    }

    /// @notice Total value in USDC: free USDC + scUSD collateral - debt
    function totalAssets() public view override returns (uint256) {
        uint256 free = IERC20(USDC).balanceOf(address(this));
        uint256 scCol = lending.collateralOf(address(this), scUSD);
        uint256 debt = lending.debtOf(address(this), USDC);
        uint256 tot = free + scCol;
        return tot > debt ? tot - debt : 0;
    }

    /// @notice APY calculation not implemented yet, returns 0
    function apy() external pure override returns (uint256) {
        return 0;
    }

    /// @dev How much to borrow each loop - 10% of scUSD collateral
    function _stepBorrow() internal view returns (uint256) {
        uint256 scCol = lending.collateralOf(address(this), scUSD);
        return scCol / 10;
    }
}
