// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "../strategies/BaseStrategy.sol";
import {ISwapXAdapter} from "../interfaces/adapters/ISwapXAdapter.sol";
import {IStSAdapter} from "../interfaces/adapters/IStSAdapter.sol";

/// @title SwapXManagedRangeStrategy
/// @notice Strategy that provides liquidity to SwapX concentrated liquidity pools.
/// Takes S tokens, converts half to stS, adds both to SwapX S/stS pool,
/// stakes LP tokens for rewards. When withdrawing, unstakes LP, exits pool,
/// converts stS back to S. SwapX rewards get harvested and kept as free S
///
/// SwapX is a next-gen DEX on Sonic with concentrated liquidity and automatic
/// range management (ALM). Pools automatically adjust price ranges to maximize
/// fees for liquidity providers. This strategy makes it easy for vaults to
/// use these pools without worrying about complex range management.
/// Similar to BEETS strategy but uses SwapX and benefits from ALM
contract SwapXManagedRangeStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    /// @notice Adapter for working with SwapX pools and gauges
    ISwapXAdapter public immutable SWAPX;
    /// @notice Adapter for converting S to stS tokens and back
    IStSAdapter public immutable STS;
    /// @notice SwapX pool where we provide S/stS liquidity
    address public immutable POOL;
    /// @notice Gauge where we stake LP tokens to earn rewards
    address public immutable GAUGE;
    /// @notice stS token contract address
    address public immutable STS_TOKEN;

    /// @notice How many LP tokens we have staked in the gauge
    uint256 public stakedLp;

    /// @param _sToken S token address (what the vault holds)
    /// @param _vault The vault contract address
    /// @param _swapXAdapter SwapX protocol adapter address
    /// @param _stsAdapter Adapter for converting S to stS
    /// @param _pool SwapX S/stS pool identifier
    /// @param _gauge Gauge for staking LP tokens
    constructor(
        address _sToken,
        address _vault,
        address _swapXAdapter,
        address _stsAdapter,
        address _pool,
        address _gauge
    ) BaseStrategy(_sToken, _vault) {
        require(
            _swapXAdapter != address(0) && _stsAdapter != address(0),
            "bad adapters"
        );
        require(_pool != address(0) && _gauge != address(0), "bad pool");
        SWAPX = ISwapXAdapter(_swapXAdapter);
        STS = IStSAdapter(_stsAdapter);
        POOL = _pool;
        GAUGE = _gauge;
        STS_TOKEN = STS.stSToken();
        // Let adapters spend our tokens
        IERC20(_sToken).approve(_stsAdapter, type(uint256).max);
        IERC20(STS_TOKEN).approve(_stsAdapter, type(uint256).max);
        IERC20(_sToken).approve(_swapXAdapter, type(uint256).max);
        IERC20(STS_TOKEN).approve(_swapXAdapter, type(uint256).max);
    }

    /// @notice Deposit S tokens into strategy. Converts half to stS,
    ///         adds both to SwapX pool, stakes the LP tokens
    /// @param amount How much S to deposit
    function deposit(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero deposit");
        uint256 sBal = ASSET.balanceOf(address(this));
        require(sBal >= amount, "insufficient funds");
        // Convert half to stS, keep half as S
        uint256 half = amount / 2;
        uint256 stSAmount = STS.stakeS(half);
        uint256 sAmount = amount - half;
        // Add liquidity to SwapX pool with 5% slippage protection
        uint256 minLpOut = ((sAmount + stSAmount) * 95) / 100;
        uint256 lpOut = SWAPX.joinPool(
            POOL,
            address(ASSET),
            STS_TOKEN,
            sAmount,
            stSAmount,
            minLpOut
        );
        // Let SwapX adapter stake our LP tokens if not approved yet
        address lpToken = SWAPX.getPoolLpToken(POOL);
        if (IERC20(lpToken).allowance(address(this), address(SWAPX)) == 0) {
            IERC20(lpToken).approve(address(SWAPX), type(uint256).max);
        }
        // Stake the LP tokens to earn rewards
        SWAPX.stakeInGauge(GAUGE, lpOut);
        stakedLp += lpOut;
    }

    /// @notice Withdraw S back to vault. If we don't have enough free S,
    ///         unstakes LP and exits SwapX pool. Converts any stS back to S.
    ///         Extra tokens stay in strategy for next time
    /// @param amount How much S to withdraw
    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        require(amount > 0, "zero withdraw");
        uint256 freeS = ASSET.balanceOf(address(this));
        if (freeS < amount) {
            // Remove all LP tokens from staking if needed
            uint256 lpBal = stakedLp;
            if (lpBal > 0) {
                SWAPX.unstakeFromGauge(GAUGE, lpBal);
                stakedLp = 0;
                // Remove liquidity from pool (no slippage protection)
                (, uint256 outStS) = SWAPX.exitPool(
                    POOL,
                    lpBal,
                    address(ASSET),
                    STS_TOKEN,
                    0,
                    0
                );
                // Convert any stS we got back to S
                if (outStS > 0) {
                    STS.unstakeToS(outStS);
                }
            }
        }
        require(ASSET.balanceOf(address(this)) >= amount, "insufficient after exit");
        ASSET.safeTransfer(VAULT, amount);
    }

    /// @notice Collect rewards from SwapX gauge and keep them as free S.
    ///         Assumes rewards are S tokens or equivalent. If rewards are different
    ///         tokens, this function should be extended to swap them
    /// @return harvested How much rewards we collected
    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256 harvested)
    {
        harvested = SWAPX.harvestRewards(GAUGE);
        // adapter transfers rewards to us automatically
    }

    /// @notice Calculate total value in S terms. This conservative version
    ///         only counts free S balance. Doesn't include LP or stS value since
    ///         that needs price oracles. Could be improved to include LP/stS valuation
    function totalAssets() public view override returns (uint256) {
        return ASSET.balanceOf(address(this));
    }

    /// @notice Get current yield percentage. Just returns SwapX pool APR
    ///         which includes fees and rewards (scaled by 1e18). External services
    ///         can calculate more accurate yield from harvested rewards
    function apy() external view override returns (uint256) {
        return SWAPX.getPoolApr(POOL);
    }
}
