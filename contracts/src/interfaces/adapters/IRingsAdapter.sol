// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRingsAdapter {
    function scUsd() external view returns (address);

    function mintScUsd(uint256 usdcIn) external returns (uint256 scMinted);

    function redeemScUsd(uint256 scAmount) external returns (uint256 usdcOut);

    /// @notice Get yield percentage for scUSD
    /// @return apy in basis points (e.g., 500 = 5%)
    function getApy() external view returns (uint256);
}
