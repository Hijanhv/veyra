// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseStrategy.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ILendingAdapter} from "../interfaces/adapters/ILendingAdapter.sol";
import {IDexV2Adapter} from "../interfaces/adapters/IDexV2Adapter.sol";

contract LeveragedLPStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    ILendingAdapter public immutable lending;
    IDexV2Adapter public immutable dex;

    address public immutable tokenB;
    address public immutable farm;
    address public immutable lpToken;

    uint256 public leverage; // e.g., 3e18 = 3x

    constructor(
        address tokenA,
        address _vault,
        address _tokenB,
        address _lendingAdapter,
        address _dexAdapter,
        address _farm,
        uint256 _leverage
    ) BaseStrategy(tokenA, _vault) {
        lending = ILendingAdapter(_lendingAdapter);
        dex = IDexV2Adapter(_dexAdapter);
        tokenB = _tokenB;
        farm = _farm;
        leverage = _leverage;

        IERC20(tokenA).approve(_lendingAdapter, type(uint256).max);
        IERC20(tokenB).approve(_lendingAdapter, type(uint256).max);
        IERC20(tokenA).approve(_dexAdapter, type(uint256).max);
        IERC20(tokenB).approve(_dexAdapter, type(uint256).max);

        lpToken = dex.lpToken(tokenA, tokenB);
        IERC20(lpToken).approve(_dexAdapter, type(uint256).max);
    }

    function deposit(uint256 amountA) external override onlyVault nonReentrant {
        // deposit tokenA as collateral
        lending.deposit(address(asset), amountA);

        // compute tokenB to borrow to reach target leverage (~ symmetric)
        // total position value ~= amountA * leverage
        uint256 targetB = ((amountA * (leverage - 1e18)) / 1e18);
        lending.borrow(tokenB, targetB);

        // add liquidity
        uint256 lp = dex.addLiquidity(address(asset), tokenB, amountA, targetB);
        // stake LP
        dex.stakeLP(farm, lp);
    }

    function withdraw(
        uint256 amountA
    ) external override onlyVault nonReentrant {
        // approximate: fully unwind (simple & safe)
        uint256 lpBal = IERC20(lpToken).balanceOf(address(this));
        dex.unstakeLP(farm, lpBal);
        (, uint256 outB) = dex.removeLiquidity(address(asset), tokenB, lpBal);

        // repay borrow with tokenB
        uint256 debtB = lending.debtOf(address(this), tokenB);
        if (debtB > 0) {
            uint256 repaid = lending.repay(tokenB, outB);
            outB -= repaid;
        }

        // withdraw collateral tokenA
        uint256 colA = lending.collateralOf(address(this), address(asset));
        if (colA > 0) lending.withdraw(address(asset), colA);

        // now we should hold tokenA >= requested
        uint256 freeA = IERC20(address(asset)).balanceOf(address(this));
        require(freeA >= amountA, "insufficient A");
        IERC20(address(asset)).safeTransfer(vault, amountA);

        // keep leftovers idle (counted in totalAssets)
    }

    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        // farm rewards handled in adapter (auto-claim); if rewards are tokenB/tokenA,
        // adapter can swap into tokenA and leave here. We return 0 by default.
        return 0;
    }

    function totalAssets() external view override returns (uint256) {
        // conservative: free tokenA only
        return IERC20(address(asset)).balanceOf(address(this));
    }

    function apy() external pure override returns (uint256) {
        return 0;
    }
}
