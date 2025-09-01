// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDexV2Adapter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amtA,
        uint256 amtB
    ) external returns (uint256 lpOut);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 lpAmount
    ) external returns (uint256 amtA, uint256 amtB);

    function stakeLP(address farm, uint256 lpAmount) external;

    function unstakeLP(address farm, uint256 lpAmount) external;

    function lpToken(
        address tokenA,
        address tokenB
    ) external view returns (address);
}
