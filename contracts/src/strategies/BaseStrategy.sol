// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IYieldStrategy} from "../interfaces/IYieldStrategy.sol";

abstract contract BaseStrategy is IYieldStrategy, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable ASSET; // the token the vault holds
    address public immutable VAULT; // the vault contract

    modifier onlyVault() {
        require(msg.sender == VAULT, "Only vault");
        _;
    }

    constructor(address _asset, address _vault) Ownable(msg.sender) {
        require(_asset != address(0) && _vault != address(0), "zero addr");
        ASSET = IERC20(_asset);
        VAULT = _vault;
    }

    // helper functions for safe transfers
    function _safePull(address from, uint256 amount) internal {
        if (amount > 0) ASSET.safeTransferFrom(from, address(this), amount);
    }

    function _safePush(address to, uint256 amount) internal {
        if (amount > 0) ASSET.safeTransfer(to, amount);
    }

    // Compatibility getters to preserve previous ABI expectations (optional)
    function asset() public view returns (IERC20) {
        return ASSET;
    }

    function vault() public view returns (address) {
        return VAULT;
    }

    // functions that child strategies must implement:
    // - deposit(uint256)
    // - withdraw(uint256)
    // - harvest() returns (uint256)
    // - totalAssets() view
    // - apy() view
}
