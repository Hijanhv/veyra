// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISiloAdapter {
    function depositCollateral(address token, uint256 amount) external;

    function withdrawCollateral(address token, uint256 amount) external;

    function borrow(address token, uint256 amount) external;

    function repay(
        address token,
        uint256 amount
    ) external returns (uint256 repaid);

    function healthFactor(address user) external view returns (uint256); // 1e18

    function debtOf(
        address user,
        address token
    ) external view returns (uint256);

    function collateralOf(
        address user,
        address token
    ) external view returns (uint256);
}
