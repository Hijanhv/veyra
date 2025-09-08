// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "../strategies/BaseStrategy.sol";
import {IRingsAdapter} from "../interfaces/adapters/IRingsAdapter.sol";
import {ILendingAdapter} from "../interfaces/adapters/ILendingAdapter.sol";
import {IStrategyIntrospection} from "../interfaces/IStrategyIntrospection.sol";

/// @title AaveRingsCarryStrategy
/// @notice Strategy that uses Aave lending and Rings yield farming together.
/// Takes wS tokens, uses them as collateral on Aave to borrow USDC, then
/// converts that USDC to scUSD via Rings to earn yield. The strategy earns
/// from scUSD yield while paying Aave borrow costs. When withdrawing, it
/// converts scUSD back to USDC, pays back the debt, and returns wS to the vault.
/// Borrow ratio controls how much USDC to borrow compared to deposited wS
contract AaveRingsCarryStrategy is BaseStrategy, IStrategyIntrospection {
    using SafeERC20 for IERC20;

    ILendingAdapter public immutable LENDING;
    IRingsAdapter public immutable RINGS;
    address public immutable USDC;
    address public immutable SC_USD;

    /// @notice How much to borrow as a percentage (5000 = 50%)
    uint256 public immutable BORROW_RATIO;

    /// @param _wSToken Wrapped Sonic token address (what the vault holds)
    /// @param _vault The vault contract address
    /// @param _lendingAdapter Aave lending adapter address
    /// @param _ringsAdapter Rings protocol adapter address
    /// @param _usdc USDC token address
    /// @param _borrowRatio Borrow percentage in basis points (0-10000)
    constructor(
        address _wSToken,
        address _vault,
        address _lendingAdapter,
        address _ringsAdapter,
        address _usdc,
        uint256 _borrowRatio,
        string memory _name
    ) BaseStrategy(_wSToken, _vault, _name) {
        require(
            _lendingAdapter != address(0) && _ringsAdapter != address(0),
            "bad adapters"
        );
        require(_borrowRatio <= 10000, "bad ratio");
        LENDING = ILendingAdapter(_lendingAdapter);
        RINGS = IRingsAdapter(_ringsAdapter);
        USDC = _usdc;
        SC_USD = RINGS.scUsd();
        BORROW_RATIO = _borrowRatio;
        IERC20(_wSToken).approve(_lendingAdapter, type(uint256).max);
        IERC20(_usdc).approve(_ringsAdapter, type(uint256).max);
        // Let lending adapter take USDC when we repay debt
        IERC20(_usdc).approve(_lendingAdapter, type(uint256).max);
        // Let Rings adapter take scUSD when we redeem it
        IERC20(SC_USD).approve(_ringsAdapter, type(uint256).max);
    }

    /// @notice Take wS from vault, use it as collateral on Aave, borrow USDC,
    /// then convert that USDC to scUSD for yield farming
    function deposit(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero amount");
        uint256 wSBal = ASSET.balanceOf(address(this));
        require(wSBal >= amount, "insufficient wS");
        // Put up wS as collateral on Aave
        LENDING.deposit(address(ASSET), amount);
        // Borrow USDC based on our target ratio (assuming 1:1 prices for now)
        uint256 borrowAmount = (amount * BORROW_RATIO) / 10000;
        if (borrowAmount > 0) {
            LENDING.borrow(USDC, borrowAmount);
            // Convert borrowed USDC to scUSD through Rings
            RINGS.mintScUsd(borrowAmount);
        }
    }

    /// @notice Send wS back to vault. First convert scUSD back to USDC,
    /// pay off debt, then withdraw the wS collateral
    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero amount");
        // Check how much USDC we owe
        uint256 debt = LENDING.debtOf(address(this), USDC);
        if (debt > 0) {
            // Convert scUSD back to USDC to pay off our debt
            uint256 scBal = IERC20(SC_USD).balanceOf(address(this));
            if (scBal > 0) {
                RINGS.redeemScUsd(scBal);
            }
            uint256 usdcBal = IERC20(USDC).balanceOf(address(this));
            uint256 repayAmount = usdcBal > debt ? debt : usdcBal;
            if (repayAmount > 0) {
                LENDING.repay(USDC, repayAmount);
            }
        }
        // Take back our wS collateral
        uint256 collateral = LENDING.collateralOf(
            address(this),
            address(ASSET)
        );
        uint256 withdrawAmount = amount > collateral ? collateral : amount;
        if (withdrawAmount > 0) {
            LENDING.withdraw(address(ASSET), withdrawAmount);
            ASSET.safeTransfer(VAULT, withdrawAmount);
        }
    }

    /// @notice Collect profits from scUSD yield and reinvest them
    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        // scUSD earns yield automatically, so check if we have extra
        // scUSD beyond what we need for debt coverage
        uint256 scBal = IERC20(SC_USD).balanceOf(address(this));
        uint256 debt = LENDING.debtOf(address(this), USDC);

        // If we have more scUSD than needed to cover debt, we can compound
        if (scBal > debt) {
            uint256 excess = scBal - debt;
            // Keep a safety buffer for debt, convert the rest to USDC
            if (excess > debt / 10) {
                // keep 10% safety buffer
                uint256 toRedeem = excess - (debt / 10);
                RINGS.redeemScUsd(toRedeem);

                // Could use this USDC to buy more wS and reinvest
                // For now, just return how much we harvested
                return toRedeem;
            }
        }
        return 0;
    }

    /// @notice Calculate total value of assets we're managing
    /// @return Total value converted to wS terms
    function totalAssets() external view override returns (uint256) {
        uint256 collateral = LENDING.collateralOf(
            address(this),
            address(ASSET)
        );
        uint256 debt = LENDING.debtOf(address(this), USDC);
        uint256 scBal = IERC20(SC_USD).balanceOf(address(this));

        // Convert scUSD value to wS equivalent (using 1:1 for simplicity)
        uint256 scValueInWs = scBal; // in real life would need price oracle

        // Net worth = collateral + scUSD value - debt (all in wS terms)
        uint256 debtInWs = debt; // simplified conversion

        return
            collateral + scValueInWs > debtInWs
                ? collateral + scValueInWs - debtInWs
                : 0;
    }

    /// @notice Get current yield percentage of the strategy
    /// @return APY in basis points
    function apy() external view override returns (uint256) {
        // Calculate net yield: what we earn from scUSD minus borrowing costs
        uint256 scUsdYield = RINGS.getApy(); // what we earn from scUSD
        uint256 borrowCost = LENDING.getBorrowApy(USDC); // what we pay to borrow

        // Net yield = (scUSD earnings * borrow ratio) - (borrowing costs * borrow ratio)
        uint256 netYield = (scUsdYield * BORROW_RATIO) / 10000;
        uint256 netCost = (borrowCost * BORROW_RATIO) / 10000;

        return netYield > netCost ? netYield - netCost : 0;
    }

    /// @notice Return component list for off-chain introspection
    function components()
        external
        view
        override
        returns (
            address asset,
            uint8 schemaVersion,
            IStrategyIntrospection.Component[] memory comps
        )
    {
        asset = address(ASSET);
        schemaVersion = 1;
        comps = new IStrategyIntrospection.Component[](2);
        // Lending
        comps[0] = IStrategyIntrospection.Component({
            kind: IStrategyIntrospection.ComponentKind.Lending,
            adapter: address(LENDING),
            token0: address(ASSET),
            token1: USDC,
            pool: address(0),
            gauge: address(0),
            extra: "",
            name: "Lending"
        });
        // Rings
        comps[1] = IStrategyIntrospection.Component({
            kind: IStrategyIntrospection.ComponentKind.Rings,
            adapter: address(RINGS),
            token0: address(0),
            token1: address(0),
            pool: address(0),
            gauge: address(0),
            extra: "",
            name: "Rings"
        });
    }
}
