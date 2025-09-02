// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IPendleAdapter
/// @notice Interface for working with Pendle to tokenize yield, trade yield tokens,
///         and swap between underlying and stable assets. Hides all the complex
///         Pendle router calls. Strategies use this to split yield tokens into
///         principal and yield parts, sell the yield for stable assets, redeem
///         principal when it matures, and convert stable back to underlying
interface IPendleAdapter {
    /// @notice Split a yield-bearing token into principal and yield tokens.
    ///         Make sure to approve the adapter to spend your tokens first
    /// @param amount Amount of the underlying asset to tokenize.
    /// @return ptAmount Amount of principal tokens minted.
    /// @return ytAmount Amount of yield tokens minted.
    function splitAsset(
        uint256 amount
    ) external returns (uint256 ptAmount, uint256 ytAmount);

    /// @notice Convert principal tokens back to the underlying asset.
    ///         Call this at or after maturity. Approve the adapter to spend
    ///         your principal tokens first
    /// @param ptAmount Amount of principal tokens to redeem.
    /// @return underlyingAmount Amount of underlying asset returned.
    function redeemPrincipal(
        uint256 ptAmount
    ) external returns (uint256 underlyingAmount);

    /// @notice Sell yield tokens for a stable asset. Approve the adapter to
    ///         spend your yield tokens first. Price reflects how much future
    ///         yield is worth today
    /// @param ytAmount Amount of yield tokens to sell.
    /// @return stableAmount Amount of stable asset received.
    function sellYTForStable(
        uint256 ytAmount
    ) external returns (uint256 stableAmount);

    /// @notice Convert stable assets back to the underlying yield-bearing token.
    ///         This lets strategies treat the stable money from selling yield tokens
    ///         as part of their main position. Might swap through Pendle or other protocols
    /// @param stableAmount Amount of stable asset to convert.
    /// @return underlyingAmount Amount of underlying asset minted.
    function stableToUnderlying(
        uint256 stableAmount
    ) external returns (uint256 underlyingAmount);

    /// @notice Get the stable token you receive when selling yield tokens
    /// @return stable Asset address (e.g., scUSD on Sonic).
    function stableToken() external view returns (address);

    /// @notice Get the yield token contract created when splitting
    /// @return yt Address of the YT token.
    function ytToken() external view returns (address yt);

    /// @notice Get the principal token contract created when splitting
    /// @return pt Address of the PT token.
    function ptToken() external view returns (address pt);
}
