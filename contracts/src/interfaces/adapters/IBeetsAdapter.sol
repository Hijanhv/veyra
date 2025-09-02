// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IBeetsAdapter
/// @notice Interface for working with BEETS liquidity pools and gauges
/// @dev Simplifies BEETS pool operations so strategies can easily join/exit pools and
/// harvest rewards. Handles different pool types (weighted, boosted, stable) internally
interface IBeetsAdapter {
    /// @notice Add liquidity to a BEETS pool with two tokens. Make sure to approve
    /// the adapter to spend your tokens first
    /// @param pool The BEETS pool address.
    /// @param tokenA First token in the pair.
    /// @param tokenB Second token in the pair.
    /// @param amtA Amount of tokenA to deposit.
    /// @param amtB Amount of tokenB to deposit.
    /// @param minLPOut Minimum LP tokens expected to prevent slippage.
    /// @return lpTokensReceived Actual LP tokens received from the pool join.
    function joinPool(
        address pool,
        address tokenA,
        address tokenB,
        uint256 amtA,
        uint256 amtB,
        uint256 minLPOut
    ) external returns (uint256 lpTokensReceived);

    /// @notice Remove liquidity from a BEETS pool by burning LP tokens
    /// @param pool The BEETS pool address.
    /// @param lpTokens Amount of LP tokens to burn.
    /// @param tokenA First token to receive.
    /// @param tokenB Second token to receive.
    /// @param minAmtA Minimum amount of tokenA expected.
    /// @param minAmtB Minimum amount of tokenB expected.
    /// @return amtA Actual amount of tokenA received.
    /// @return amtB Actual amount of tokenB received.
    function exitPool(
        address pool,
        uint256 lpTokens,
        address tokenA,
        address tokenB,
        uint256 minAmtA,
        uint256 minAmtB
    ) external returns (uint256 amtA, uint256 amtB);

    /// @notice Stake LP tokens in the gauge to earn extra rewards
    /// @param gauge The gauge contract address for the pool.
    /// @param lpTokens Amount of LP tokens to stake.
    function stakeInGauge(address gauge, uint256 lpTokens) external;

    /// @notice Remove LP tokens from the gauge
    /// @param gauge The gauge contract address.
    /// @param lpTokens Amount of LP tokens to unstake.
    function unstakeFromGauge(address gauge, uint256 lpTokens) external;

    /// @notice Collect rewards from the gauge and convert them to base asset
    /// @param gauge The gauge contract address.
    /// @return rewards Total rewards harvested and converted to base asset.
    function harvestRewards(address gauge) external returns (uint256 rewards);

    /// @notice Get how much S one stS is worth
    /// @return rate The current stS/S exchange rate (scaled by 1e18).
    function stSRate() external view returns (uint256 rate);

    /// @notice Get the LP token contract for a pool
    /// @param pool The BEETS pool address.
    /// @return lpToken The LP token contract address.
    function getPoolLPToken(
        address pool
    ) external view returns (address lpToken);

    /// @notice Get the gauge contract for a pool
    /// @param pool The BEETS pool address.
    /// @return gauge The gauge contract address.
    function getPoolGauge(address pool) external view returns (address gauge);

    /// @notice Get the total yield percentage for a pool (base yield + rewards)
    /// @param pool The BEETS pool address.
    /// @return apr The current APR (scaled by 1e18, e.g., 5% = 0.05e18).
    function getPoolAPR(address pool) external view returns (uint256 apr);

    /// @notice Check how many LP tokens an account has staked
    /// @param gauge The gauge contract address.
    /// @param account The account to check.
    /// @return balance The staked LP token balance.
    function getStakedBalance(
        address gauge,
        address account
    ) external view returns (uint256 balance);

    /// @notice Check how many rewards an account can claim
    /// @param gauge The gauge contract address.
    /// @param account The account to check.
    /// @return rewards Available rewards that can be harvested.
    function getPendingRewards(
        address gauge,
        address account
    ) external view returns (uint256 rewards);
}
