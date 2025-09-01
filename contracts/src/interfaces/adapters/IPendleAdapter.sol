// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPendleAdapter {
    function stake_scUSD(uint256 scAmount) external returns (uint256 stkAmount);

    function split(
        uint256 stkAmount
    ) external returns (address pt, uint256 ptAmt, address yt, uint256 ytAmt);

    function sellYTForSCUSD(
        address yt,
        uint256 ytAmt
    ) external returns (uint256 scOut);

    function redeemPTForSCUSD(
        address pt,
        uint256 ptAmt
    ) external returns (uint256 scOut);

    function scUSD() external view returns (address);
}
