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
}
