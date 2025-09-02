// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IYieldStrategy {
    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function harvest() external returns (uint256);

    function totalAssets() external view returns (uint256);

    function apy() external view returns (uint256);
}
