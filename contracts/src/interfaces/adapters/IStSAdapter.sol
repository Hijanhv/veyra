// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStSAdapter {
    function stakeS(uint256 amount) external returns (uint256 stSMinted);

    function unstakeToS(uint256 stSAmount) external returns (uint256 sOut);

    function sToken() external view returns (address);

    function stSToken() external view returns (address);

    function rate() external view returns (uint256); // stS per S (1e18)
}
