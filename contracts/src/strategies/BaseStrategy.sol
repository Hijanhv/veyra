// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IYieldStrategy} from "../interfaces/IYieldStrategy.sol";

abstract contract BaseStrategy is IYieldStrategy, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;     // vault's asset()
    address public immutable vault;    // VeyraVault

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    constructor(address _asset, address _vault) Ownable(msg.sender) {
        require(_asset != address(0) && _vault != address(0), "zero addr");
        asset = IERC20(_asset);
        vault = _vault;
    }

    // helpers
    function _safePull(address from, uint256 amount) internal {
        if (amount > 0) asset.safeTransferFrom(from, address(this), amount);
    }

    function _safePush(address to, uint256 amount) internal {
        if (amount > 0) asset.safeTransfer(to, amount);
    }

    // mandatory IYieldStrategy funcs implemented by children:
    // - deposit(uint256)
    // - withdraw(uint256)
    // - harvest() returns (uint256)
    // - totalAssets() view
    // - apy() view
}
