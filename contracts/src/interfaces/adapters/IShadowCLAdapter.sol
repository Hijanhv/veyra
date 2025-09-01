// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IShadowCLAdapter {
    function addPosition(
        address token0,
        address token1,
        uint256 amt0,
        uint256 amt1,
        int24 lowerTick,
        int24 upperTick
    ) external returns (uint256 tokenId, uint128 liquidity);

    function removePosition(
        uint256 tokenId
    ) external returns (uint256 amount0, uint256 amount1);

    function harvest(
        uint256 tokenId
    ) external returns (uint256 fees0, uint256 fees1);

    function token0() external view returns (address);

    function token1() external view returns (address);
}
