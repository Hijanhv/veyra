// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IEggsAdapter
/// @notice Interface for working with Eggs Finance. Lets you mint EGGS tokens
/// from S, use EGGS as collateral to borrow more S, and redeem EGGS back to S.
/// Also handles debt repayment and balance checking
///
/// Eggs Finance on Sonic lets you create leveraged yield positions by staking S
/// to mint EGGS (with a fee), then using those EGGS to borrow more S.
/// You can reinvest the borrowed S into yield farms like Shadow or BEETS.
/// This adapter makes it easy for strategies to use Eggs contracts
interface IEggsAdapter {
    /// @notice Get the EGGS token contract address
    /// @return eggs Address of the EGGS token.
    function eggsToken() external view returns (address eggs);

    /// @notice Convert S tokens into EGGS tokens. Approve this adapter to spend
    /// your S first. Note: Eggs charges a minting fee (like 2.5%)
    /// @param sAmount Amount of S to convert to EGGS.
    /// @return eggsMinted Number of EGGS tokens minted for the caller.
    function mintEGGS(uint256 sAmount) external returns (uint256 eggsMinted);

    /// @notice Convert EGGS tokens back to S tokens 1:1. Make sure to approve
    /// this adapter to spend your EGGS first
    /// @param eggsAmount Amount of EGGS to redeem.
    /// @return sAmount Amount of S returned to the caller.
    function redeemEGGS(uint256 eggsAmount) external returns (uint256 sAmount);

    /// @notice Borrow S tokens using your EGGS as collateral. You need to have
    /// minted EGGS first. This will increase your debt
    /// @param sAmount Amount of S to borrow.
    function borrowS(uint256 sAmount) external;

    /// @notice Pay back borrowed S tokens to reduce your debt. Only pays back
    /// up to the amount you actually owe
    /// @param sAmount Amount of S offered for repayment.
    /// @return repaid The amount of S debt repaid.
    function repayS(uint256 sAmount) external returns (uint256 repaid);

    /// @notice Check how many EGGS tokens a user has as collateral
    /// @param user Address of the account to query.
    /// @return eggsCollateral Amount of EGGS tokens collateralized by the user.
    function collateralOf(
        address user
    ) external view returns (uint256 eggsCollateral);

    /// @notice Check how much S a user has borrowed
    /// @param user Address of the account to query.
    /// @return sDebt Amount of S borrowed by the user.
    function debtOf(address user) external view returns (uint256 sDebt);

    /// @notice Check if a position is safe from liquidation. Above 1.0 is safe,
    /// below 1.0 might get liquidated
    /// @param user Address of the account to query.
    /// @return healthFactor  Health factor in 1e18 precision.
    function healthFactor(
        address user
    ) external view returns (uint256 healthFactor);

    /// @notice Get the yield percentage for supplying S as collateral.
    /// Eggs might pay rewards to EGGS minters or share fees
    /// @return apy Supply APY in basis points (e.g. 250 = 2.5%).
    function getSupplyAPY() external view returns (uint256 apy);

    /// @notice Get the interest rate for borrowing S. This cost should be
    /// subtracted from your yield calculations
    /// @return apy Borrow APY in basis points (e.g. 450 = 4.5%).
    function getBorrowAPY() external view returns (uint256 apy);
}
