// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IYieldStrategy {
    /// @notice Human-readable strategy name for UI/debugging
    function name() external view returns (string memory);

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function harvest() external returns (uint256);

    function totalAssets() external view returns (uint256);

    /// @notice Annualized performance metric
    /// @dev Return value MUST be in basis points (1% = 100 bps)
    function apy() external view returns (uint256);
}
