// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ILendingAdapter} from "../interfaces/adapters/ILendingAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

/// @title MockLendingAdapter
/// @notice Minimal lending adapter mock simulating deposits, borrows and repayments
contract MockLendingAdapter is ILendingAdapter {
    using SafeERC20 for IERC20;

    mapping(address => mapping(address => uint256)) public coll; // user => token => amount
    mapping(address => mapping(address => uint256)) public deb; // user => token => amount
    uint256 public hf = 2e18; // configurable health factor for tests

    function deposit(address token, uint256 amount) external override {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        coll[msg.sender][token] += amount;
    }

    function withdraw(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        uint256 c = coll[msg.sender][token];
        require(c >= amount, "no collateral");
        coll[msg.sender][token] = c - amount;
        MockERC20(token).mint(msg.sender, amount);
        return amount;
    }

    function borrow(address token, uint256 amount) external override {
        deb[msg.sender][token] += amount;
        MockERC20(token).mint(msg.sender, amount);
    }

    function repay(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        uint256 owed = deb[msg.sender][token];
        uint256 repaid = amount > owed ? owed : amount;
        deb[msg.sender][token] = owed - repaid;
        IERC20(token).safeTransferFrom(msg.sender, address(this), repaid);
        return repaid;
    }

    function collateralOf(
        address user,
        address token
    ) external view override returns (uint256) {
        return coll[user][token];
    }

    function debtOf(
        address user,
        address token
    ) external view override returns (uint256) {
        return deb[user][token];
    }

    function healthFactor(address) external view override returns (uint256) {
        return hf;
    }

    function getSupplyApy(address) external pure override returns (uint256) {
        return 250; // 2.5%
    }

    function getBorrowApy(address) external pure override returns (uint256) {
        return 450; // 4.5%
    }

    /// @notice Helper to change health factor for testing
    function setHealthFactor(uint256 _hf) external {
        hf = _hf;
    }
}
