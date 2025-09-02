// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ISwapXAdapter
/// @notice Interface for working with SwapX concentrated liquidity pools and gauges
/// on Sonic. SwapX is a next-gen DEX with concentrated liquidity and automatic
/// management. This adapter makes it easy for strategies to add/remove liquidity
/// and stake LP tokens. Pools can be managed ranges or custom ones, with rewards
/// from veSwapX incentives
interface ISwapXAdapter {
    /// @notice Add liquidity to a SwapX pool with two tokens. Make sure to
    /// approve the adapter to spend your tokens first
    /// @param pool The SwapX pool identifier.
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

    /// @notice Remove liquidity from a SwapX pool by burning LP tokens.
    /// Approve the adapter to spend your LP tokens first
    /// @param pool The SwapX pool identifier.
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

    /// @notice Stake LP tokens in the SwapX gauge to earn extra rewards.
    /// The gauge controls how incentive tokens and fee rebates are distributed
    /// @param gauge The gauge contract address for the pool.
    /// @param lpTokens Amount of LP tokens to stake.
    function stakeInGauge(address gauge, uint256 lpTokens) external;

    /// @notice Remove LP tokens from the SwapX gauge
    /// @param gauge The gauge contract address.
    /// @param lpTokens Amount of LP tokens to unstake.
    function unstakeFromGauge(address gauge, uint256 lpTokens) external;

    /// @notice Collect rewards from the gauge and convert them to base asset
    /// when possible. Rewards come from trading fees and veSwapX emissions
    /// @param gauge The gauge contract address.
    /// @return rewards Total rewards harvested and converted to base asset.
    function harvestRewards(address gauge) external returns (uint256 rewards);

    /// @notice Get the LP token contract for a SwapX pool
    /// @param pool The pool identifier.
    /// @return lpToken The LP token contract address.
    function getPoolLPToken(
        address pool
    ) external view returns (address lpToken);

    /// @notice Get the gauge contract for a SwapX pool. Gauges distribute
    /// veSwapX rewards to liquidity providers
    /// @param pool The pool identifier.
    /// @return gauge The gauge contract address.
    function getPoolGauge(address pool) external view returns (address gauge);

    /// @notice Get the total yield percentage for a pool (base yield + rewards).
    /// APR is scaled by 1e18, so 5% = 0.05e18
    /// @param pool The SwapX pool identifier.
    /// @return apr The current APR.
    function getPoolAPR(address pool) external view returns (uint256 apr);

    /// @notice Check how many rewards an account can claim from the gauge
    /// @param gauge The gauge contract address.
    /// @param account The account to check.
    /// @return rewards Available rewards that can be harvested.
    function getPendingRewards(
        address gauge,
        address account
    ) external view returns (uint256 rewards);
}
