// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEggsAdapter {
    function eggsToken() external view returns (address);

    function mintFromS(uint256 sAmount) external returns (uint256 eggsOut);

    function depositCollateral(uint256 eggsAmount) external;

    function borrowS(uint256 amount) external;

    function repayS(uint256 amount) external returns (uint256 repaid);

    function redeemToS(uint256 eggsAmount) external returns (uint256 sOut);

    function debtOf(address user) external view returns (uint256);

    function collateralOf(address user) external view returns (uint256);

    function healthFactor(address user) external view returns (uint256);
}
