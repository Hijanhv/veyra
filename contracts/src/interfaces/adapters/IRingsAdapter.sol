// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRingsAdapter {
    function scUSD() external view returns (address);

    function mint_scUSD(uint256 usdcIn) external returns (uint256 scMinted);

    function redeem_scUSD(uint256 scAmount) external returns (uint256 usdcOut);
}
