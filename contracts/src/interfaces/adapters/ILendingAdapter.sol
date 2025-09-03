// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILendingAdapter {
    function deposit(address token, uint256 amount) external;

    function withdraw(address token, uint256 amount) external returns (uint256);

    function borrow(address token, uint256 amount) external;

    function repay(address token, uint256 amount) external returns (uint256);

    function collateralOf(
        address user,
        address token
    ) external view returns (uint256);

    function debtOf(
        address user,
        address token
    ) external view returns (uint256);

    function healthFactor(address user) external view returns (uint256); // 1e18

    /// @notice Get yield percentage for supplying a token
    /// @param token The token address
    /// @return APY in basis points (e.g., 250 = 2.5%)
    function getSupplyApy(address token) external view returns (uint256);

    /// @notice Get interest rate for borrowing a token
    /// @param token The token address
    /// @return APY in basis points (e.g., 450 = 4.5%)
    function getBorrowApy(address token) external view returns (uint256);
}
