// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISwapXAdapter} from "../interfaces/adapters/ISwapXAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

/// @title MockSwapXAdapter
/// @notice Minimal SwapX adapter mock for strategy wiring on-chain
contract MockSwapXAdapter is ISwapXAdapter {
    using SafeERC20 for IERC20;

    MockERC20 public lpToken;
    address public rewardToken; // typically S

    mapping(address => uint256) public staked;
    mapping(address => uint256) public suppliedA;
    mapping(address => uint256) public suppliedB;
    uint256 public rewardAmount;

    constructor(address _rewardToken) {
        rewardToken = _rewardToken;
        lpToken = new MockERC20("LP", "LP", 18);
    }

    function joinPool(
        address /*pool*/,
        address tokenA,
        address tokenB,
        uint256 amtA,
        uint256 amtB,
        uint256 /*minLpOut*/
    ) external override returns (uint256 lpTokensReceived) {
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amtA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amtB);
        suppliedA[msg.sender] += amtA;
        suppliedB[msg.sender] += amtB;
        lpTokensReceived = amtA + amtB;
        lpToken.mint(msg.sender, lpTokensReceived);
    }

    function exitPool(
        address /*pool*/,
        uint256 lpTokens,
        address tokenA,
        address tokenB,
        uint256 /*minAmtA*/,
        uint256 /*minAmtB*/
    ) external override returns (uint256 amtA, uint256 amtB) {
        IERC20(address(lpToken)).safeTransferFrom(msg.sender, address(this), lpTokens);
        uint256 totalSupplied = suppliedA[msg.sender] + suppliedB[msg.sender];
        if (totalSupplied == 0) return (0, 0);
        amtA = (suppliedA[msg.sender] * lpTokens) / totalSupplied;
        amtB = (suppliedB[msg.sender] * lpTokens) / totalSupplied;
        if (amtA > suppliedA[msg.sender]) amtA = suppliedA[msg.sender];
        if (amtB > suppliedB[msg.sender]) amtB = suppliedB[msg.sender];
        suppliedA[msg.sender] -= amtA;
        suppliedB[msg.sender] -= amtB;
        IERC20(tokenA).safeTransfer(msg.sender, amtA);
        IERC20(tokenB).safeTransfer(msg.sender, amtB);
    }

    function stakeInGauge(address /*gauge*/, uint256 lpTokens) external override {
        IERC20(address(lpToken)).safeTransferFrom(msg.sender, address(this), lpTokens);
        staked[msg.sender] += lpTokens;
    }

    function unstakeFromGauge(address /*gauge*/, uint256 lpTokens) external override {
        require(staked[msg.sender] >= lpTokens, "not staked");
        staked[msg.sender] -= lpTokens;
        IERC20(address(lpToken)).safeTransfer(msg.sender, lpTokens);
    }

    function harvestRewards(address /*gauge*/) external override returns (uint256 rewards) {
        rewards = rewardAmount;
        if (rewards > 0) {
            MockERC20(rewardToken).mint(msg.sender, rewards);
            rewardAmount = 0;
        }
    }

    function getPoolLpToken(address /*pool*/) external view override returns (address) {
        return address(lpToken);
    }

    function getPoolGauge(address /*pool*/) external pure override returns (address) {
        return address(0xC0FFEE);
    }

    function getPoolApr(address /*pool*/) external pure override returns (uint256) {
        return 600 * 1e14; // 6%
    }

    function getPendingRewards(address /*gauge*/, address /*account*/) external view override returns (uint256) {
        return rewardAmount;
    }

    /// @notice Helper to set reward amount for tests
    function setReward(uint256 amount) external {
        rewardAmount = amount;
    }
}
