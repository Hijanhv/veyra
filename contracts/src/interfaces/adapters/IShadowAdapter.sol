// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IShadowAdapter
/// @notice Interface for working with Shadow Exchange. Shadow is a concentrated
/// liquidity DEX on Sonic that lets you provide liquidity in tight price ranges,
/// stake LP tokens and earn rewards. Uses an x(3,3) model to align everyone's
/// incentives. This adapter makes it easy for strategies to use Shadow without
/// dealing with the complex underlying contracts
interface IShadowAdapter {
    /// @notice Add liquidity to a Shadow pool with two tokens. Make sure to approve
    /// this adapter to spend your tokens first. Shadow uses concentrated liquidity
    /// ranges - the adapter handles picking the right range for you
    /// @param pool Identifier of the pool (e.g. pair address or ID).
    /// @param tokenA Address of the first token.
    /// @param tokenB Address of the second token.
    /// @param amtA Amount of tokenA to deposit.
    /// @param amtB Amount of tokenB to deposit.
    /// @param minLPOut Minimum LP tokens expected to prevent slippage.
    /// @return lpTokensReceived Amount of LP tokens minted.
    function joinPool(
        address pool,
        address tokenA,
        address tokenB,
        uint256 amtA,
        uint256 amtB,
        uint256 minLPOut
    ) external returns (uint256 lpTokensReceived);

    /// @notice Remove liquidity from a Shadow pool by burning LP tokens.
    /// The adapter handles all the complex range settlement stuff
    /// @param pool Identifier of the pool.
    /// @param lpTokens Amount of LP tokens to burn.
    /// @param tokenA Address of the first token to receive.
    /// @param tokenB Address of the second token to receive.
    /// @param minAmtA Minimum amount of tokenA expected.
    /// @param minAmtB Minimum amount of tokenB expected.
    /// @return amtA Actual amount of tokenA returned.
    /// @return amtB Actual amount of tokenB returned.
    function exitPool(
        address pool,
        uint256 lpTokens,
        address tokenA,
        address tokenB,
        uint256 minAmtA,
        uint256 minAmtB
    ) external returns (uint256 amtA, uint256 amtB);

    /// @notice Stake LP tokens in Shadow's gauge to earn extra rewards.
    /// The gauge is usually a separate contract that manages rewards
    /// @param gauge Gauge address associated with the pool.
    /// @param lpTokens Amount of LP tokens to stake.
    function stakeInGauge(address gauge, uint256 lpTokens) external;

    /// @notice Remove LP tokens from the Shadow gauge
    /// @param gauge Gauge address.
    /// @param lpTokens Amount of LP tokens to unstake.
    function unstakeFromGauge(address gauge, uint256 lpTokens) external;

    /// @notice Collect rewards from the gauge and convert them to base asset.
    /// Shadow rewards are usually SHADOW tokens or other incentive tokens.
    /// The adapter handles collection and conversion automatically
    /// @param gauge Gauge address.
    /// @return rewards Total rewards harvested, returned in the base
    /// asset of the strategy (e.g. S).
    function harvestRewards(address gauge) external returns (uint256 rewards);

    /// @notice Get the yield percentage for a pool (not including borrow costs).
    /// This lets strategies tell vaults what kind of returns to expect
    /// @param pool Identifier of the pool.
    /// @return apr The current APR scaled by 1e18 (e.g., 5% = 0.05e18).
    function getPoolAPR(address pool) external view returns (uint256 apr);

    /// @notice Get the LP token contract for a pool. Useful for checking approvals
    /// @param pool Identifier of the pool.
    /// @return lpToken Address of the LP token contract.
    function getPoolLPToken(
        address pool
    ) external view returns (address lpToken);

    /// @notice Get the gauge contract for a pool
    /// @param pool Identifier of the pool.
    /// @return gauge Address of the gauge contract.
    function getPoolGauge(address pool) external view returns (address gauge);

    /// @notice Check how many LP tokens an account has staked in the gauge
    /// @param gauge Gauge contract address.
    /// @param account Address to query.
    /// @return balance Amount of LP tokens staked by `account`.
    function getStakedBalance(
        address gauge,
        address account
    ) external view returns (uint256 balance);
}
