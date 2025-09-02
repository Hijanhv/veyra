// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IProtocolAdapter {
    function getApy() external view returns (uint256);

    function getTvl() external view returns (uint256);

    function getRiskScore() external view returns (uint256);

    function isActive() external view returns (bool);
}
