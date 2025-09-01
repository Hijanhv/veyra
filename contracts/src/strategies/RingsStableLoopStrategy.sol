// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseStrategy.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRingsAdapter} from "../interfaces/adapters/IRingsAdapter.sol";
import {ILendingAdapter} from "../interfaces/adapters/ILendingAdapter.sol";

contract RingsStableLoopStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IRingsAdapter public immutable rings;
    ILendingAdapter public immutable lending;
    address public immutable USDC;
    address public immutable SCUSD;

    uint256 public targetHF; // e.g., 1.5e18
    uint256 public maxIterations; // loop cap

    constructor(
        address _usdc,
        address _vault,
        address _ringsAdapter,
        address _lendingAdapter,
        uint256 _targetHF,
        uint256 _maxIter
    ) BaseStrategy(_usdc, _vault) {
        USDC = _usdc;
        rings = IRingsAdapter(_ringsAdapter);
        lending = ILendingAdapter(_lendingAdapter);
        SCUSD = rings.scUSD();
        targetHF = _targetHF;
        maxIterations = _maxIter;

        IERC20(USDC).approve(_ringsAdapter, type(uint256).max);
        IERC20(SCUSD).approve(_lendingAdapter, type(uint256).max);
        IERC20(USDC).approve(_lendingAdapter, type(uint256).max);
    }

    function deposit(uint256 amount) external override onlyVault nonReentrant {
        // mint scUSD
        uint256 sc = rings.mint_scUSD(amount);
        // supply scUSD
        lending.deposit(SCUSD, sc);

        uint256 it;
        while (it < maxIterations) {
            uint256 hf = lending.healthFactor(address(this));
            if (hf <= targetHF) break;

            // borrow USDC against scUSD
            uint256 borrow = _stepBorrow();
            lending.borrow(USDC, borrow);

            // mint more scUSD
            uint256 more = rings.mint_scUSD(borrow);
            // supply again
            lending.deposit(SCUSD, more);
            it++;
        }
    }

    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        // use free USDC first
        uint256 free = IERC20(USDC).balanceOf(address(this));
        if (free < amount) {
            uint256 need = amount - free;

            // unwind: redeem scUSD, repay, withdraw collateral
            // repay any USDC debt up to `need`
            uint256 debt = lending.debtOf(address(this), USDC);
            if (debt > 0) {
                // withdraw some scUSD collateral
                uint256 scCol = lending.collateralOf(address(this), SCUSD);
                uint256 toPull = scCol > need ? need : scCol;
                lending.withdraw(SCUSD, toPull);
                uint256 usdcFromRedeem = rings.redeem_scUSD(toPull);
                uint256 repaid = lending.repay(
                    USDC,
                    usdcFromRedeem > debt ? debt : usdcFromRedeem
                );
                if (repaid < debt && usdcFromRedeem > repaid) {
                    // leftover USDC increases our free buffer
                }
            }

            // if still need, withdraw more scUSD collateral -> redeem to USDC
            uint256 stillNeed = amount - IERC20(USDC).balanceOf(address(this));
            if (stillNeed > 0) {
                lending.withdraw(SCUSD, stillNeed);
                rings.redeem_scUSD(stillNeed);
            }
        }

        IERC20(USDC).safeTransfer(vault, amount);
    }

    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        // Rings accrues in scUSD rate; lending incentives can be harvested in adapter
        return 0;
    }

    function totalAssets() external view override returns (uint256) {
        // rough: USDC free + (scUSD collateral valued ~1:1) - USDC debt
        uint256 free = IERC20(USDC).balanceOf(address(this));
        uint256 scCol = lending.collateralOf(address(this), SCUSD);
        uint256 debt = lending.debtOf(address(this), USDC);
        uint256 tot = free + scCol;
        return tot > debt ? tot - debt : 0;
    }

    function apy() external pure override returns (uint256) {
        return 0;
    }

    function _stepBorrow() internal view returns (uint256) {
        // simple step: 10% of scUSD collateral
        uint256 scCol = lending.collateralOf(address(this), SCUSD);
        return scCol / 10;
    }
}
