// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEggsAdapter} from "../interfaces/adapters/IEggsAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

/// @title MockEggsAdapter
/// @notice Minimal Eggs Finance adapter mock for leveraged S positions
contract MockEggsAdapter is IEggsAdapter {
    using SafeERC20 for IERC20;

    MockERC20 public sToken;
    MockERC20 public eggs;
    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;

    constructor(address _sToken) {
        sToken = MockERC20(_sToken);
        eggs = new MockERC20("EGGS", "EGGS", 18);
    }

    function eggsToken() external view override returns (address) {
        return address(eggs);
    }

    function mintEggs(uint256 sAmount) external override returns (uint256 eggsMinted) {
        IERC20(address(sToken)).safeTransferFrom(msg.sender, address(this), sAmount);
        eggsMinted = (sAmount * 975) / 1000; // 2.5% fee
        eggs.mint(msg.sender, eggsMinted);
        collateral[msg.sender] += eggsMinted;
    }

    function redeemEggs(uint256 eggsAmount) external override returns (uint256 sAmount) {
        IERC20(address(eggs)).safeTransferFrom(msg.sender, address(this), eggsAmount);
        if (collateral[msg.sender] >= eggsAmount) collateral[msg.sender] -= eggsAmount;
        sToken.mint(msg.sender, eggsAmount);
        return eggsAmount;
    }

    function borrowS(uint256 sAmount) external override {
        debt[msg.sender] += sAmount;
        sToken.mint(msg.sender, sAmount);
    }

    function repayS(uint256 sAmount) external override returns (uint256 repaid) {
        uint256 owed = debt[msg.sender];
        repaid = sAmount > owed ? owed : sAmount;
        debt[msg.sender] = owed - repaid;
        IERC20(address(sToken)).safeTransferFrom(msg.sender, address(this), repaid);
        return repaid;
    }

    function collateralOf(address user) external view override returns (uint256) {
        return collateral[user];
    }

    function debtOf(address user) external view override returns (uint256) {
        return debt[user];
    }

    function healthFactor(address) external pure override returns (uint256) {
        return 2e18;
    }

    function getSupplyApy() external pure override returns (uint256) {
        return 250; // 2.5%
    }

    function getBorrowApy() external pure override returns (uint256) {
        return 500; // 5%
    }
}

