// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRingsAdapter} from "../interfaces/adapters/IRingsAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

/// @title MockRingsAdapter
/// @notice Simple Rings adapter that mints a mock scUSD and redeems 1:1 vs USDC
contract MockRingsAdapter is IRingsAdapter {
    using SafeERC20 for IERC20;

    address public usdc;
    MockERC20 public scToken;

    constructor(address _usdc) {
        usdc = _usdc;
        scToken = new MockERC20("scUSD", "scUSD", 18);
    }

    function scUsd() external view override returns (address) {
        return address(scToken);
    }

    function mintScUsd(uint256 usdcIn) external override returns (uint256) {
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), usdcIn);
        scToken.mint(msg.sender, usdcIn);
        return usdcIn;
    }

    function redeemScUsd(uint256 scAmount) external override returns (uint256) {
        IERC20(address(scToken)).safeTransferFrom(
            msg.sender,
            address(this),
            scAmount
        );
        MockERC20(usdc).mint(msg.sender, scAmount);
        return scAmount;
    }

    function getApy() external pure override returns (uint256) {
        return 1300; // 13% in basis points
    }
}
