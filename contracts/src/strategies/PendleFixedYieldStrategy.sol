// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseStrategy.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPendleAdapter} from "../interfaces/adapters/IPendleAdapter.sol";

contract PendleFixedYieldStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IPendleAdapter public immutable pendle;

    // we hold PT (principal) and idle scUSD from YT sale
    address public PT;
    uint256 public ptBalance;

    constructor(
        address _scUSD,
        address _vault,
        address _pendleAdapter
    ) BaseStrategy(_scUSD, _vault) {
        pendle = IPendleAdapter(_pendleAdapter);
        IERC20(_scUSD).approve(_pendleAdapter, type(uint256).max);
    }

    function deposit(uint256 amount) external override onlyVault nonReentrant {
        // stake scUSD -> stk
        uint256 stk = pendle.stake_scUSD(amount);
        // split -> get PT + YT
        (address pt, uint256 ptAmt, address yt, uint256 ytAmt) = pendle.split(
            stk
        );
        PT = pt;
        ptBalance += ptAmt;

        // sell YT now => lock fixed rate
        pendle.sellYTForSCUSD(yt, ytAmt);
        // proceeds remain idle (improve fixed-rate upfront)
        // they'll be counted in totalAssets()
    }

    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        // 1) use idle scUSD first
        uint256 free = IERC20(pendle.scUSD()).balanceOf(address(this));
        if (free < amount) {
            uint256 need = amount - free;
            // 2) redeem some PT -> scUSD
            // assume PT redeem linear 1:1 near maturity (adapter handles actual math)
            pendle.redeemPTForSCUSD(PT, need);
        }
        IERC20(pendle.scUSD()).safeTransfer(vault, amount);
    }

    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        // nothing to claim; PT accrues to redemption
        return 0;
    }

    function totalAssets() external view override returns (uint256) {
        // conservative: idle scUSD only (PT not counted until redeem);
        // you can improve by having adapter expose PV of PT.
        return IERC20(pendle.scUSD()).balanceOf(address(this));
    }

    function apy() external pure override returns (uint256) {
        return 0;
    }
}
