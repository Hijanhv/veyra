// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IYieldStrategy} from "../interfaces/IYieldStrategy.sol";

/**
 * @title AaveStrategy
 * @notice Yield strategy for Aave V3 lending markets on Sonic
 */
contract AaveStrategy is IYieldStrategy {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    address public immutable vault;
    
    // TODO: Add Aave V3 interfaces and addresses for Sonic
    
    constructor(address _asset, address _vault) {
        asset = IERC20(_asset);
        vault = _vault;
    }

    function deposit(uint256 amount) external override {
        require(msg.sender == vault, "Only vault");
        // TODO: Implement Aave lending on Sonic
        // 1. Approve Aave pool
        // 2. Supply assets to Aave
        // 3. Receive aTokens
    }

    function withdraw(uint256 amount) external override {
        require(msg.sender == vault, "Only vault");
        // TODO: Implement Aave withdrawal
        // 1. Withdraw from Aave pool
        // 2. Transfer assets back to vault
    }

    function harvest() external override returns (uint256) {
        // TODO: Claim Aave rewards and compound
        // 1. Claim stkAAVE or other incentives
        // 2. Swap rewards for underlying asset
        // 3. Re-deposit for compounding
        return 0;
    }

    function totalAssets() external view override returns (uint256) {
        // TODO: Return total assets in Aave
        // Get aToken balance and convert to underlying
        return 0;
    }

    function apy() external view override returns (uint256) {
        // TODO: Calculate current Aave APY on Sonic
        // Including base lending rate + incentives
        return 0;
    }
}