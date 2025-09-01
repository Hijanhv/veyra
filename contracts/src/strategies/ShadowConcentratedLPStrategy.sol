// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseStrategy.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStSAdapter} from "../interfaces/adapters/IStSAdapter.sol";
import {IShadowCLAdapter} from "../interfaces/adapters/IShadowCLAdapter.sol";

contract ShadowConcentratedLPStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IStSAdapter public immutable sts;
    IShadowCLAdapter public immutable cl;

    uint256 public tokenId; // single managed position
    int24 public lowerTick; // set around 1:1
    int24 public upperTick;

    constructor(
        address _sToken,
        address _vault,
        address _stsAdapter,
        address _shadowAdapter,
        int24 _lower,
        int24 _upper
    ) BaseStrategy(_sToken, _vault) {
        sts = IStSAdapter(_stsAdapter);
        cl = IShadowCLAdapter(_shadowAdapter);

        lowerTick = _lower;
        upperTick = _upper;

        IERC20(_sToken).approve(_stsAdapter, type(uint256).max);
        IERC20(_sToken).approve(_shadowAdapter, type(uint256).max);
        IERC20(sts.stSToken()).approve(_shadowAdapter, type(uint256).max);
    }

    /// @notice deposit S; convert half to stS; add tight-range liquidity
    function deposit(uint256 amount) external override onlyVault nonReentrant {
        uint256 half = amount / 2;

        // make stS
        uint256 stS = sts.stakeS(half);

        // add CL position (token0=S, token1=stS or vice versa depending on pool)
        (uint256 id, ) = cl.addPosition(
            sts.sToken(),
            sts.stSToken(),
            amount - half,
            stS,
            lowerTick,
            upperTick
        );

        if (tokenId == 0) tokenId = id; // manage single position
    }

    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        // remove all liquidity; convert stS->S; return requested S; re-add remainder
        (uint256 outS, uint256 outStS) = cl.removePosition(tokenId);
        uint256 sFromStS = sts.unstakeToS(outStS);
        uint256 totalS = outS + sFromStS;

        require(totalS >= amount, "insufficient");

        IERC20(sts.sToken()).safeTransfer(vault, amount);

        uint256 leftover = totalS - amount;
        if (leftover > 0) {
            // put back liquidity at same range
            uint256 stSleft = sts.stakeS(leftover / 2);
            cl.addPosition(
                sts.sToken(),
                sts.stSToken(),
                leftover - (leftover / 2),
                stSleft,
                lowerTick,
                upperTick
            );
        }
    }

    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        (uint256 feesS, uint256 feesStS) = cl.harvest(tokenId);
        uint256 sFromStS = sts.unstakeToS(feesStS);
        // keep fees as idle S (accounted in totalAssets)
        return feesS + sFromStS;
    }

    function totalAssets() external view override returns (uint256) {
        // idle S + (we ignore in-range value for simplicity; adapters can expose it)
        return IERC20(sts.sToken()).balanceOf(address(this));
    }

    function apy() external pure override returns (uint256) {
        return 0;
    }
}
