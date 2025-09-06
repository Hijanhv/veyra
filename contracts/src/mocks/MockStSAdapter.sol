// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStSAdapter} from "../interfaces/adapters/IStSAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

/// @title MockStSAdapter
/// @notice Simple 1:1 S <-> stS adapter used for mock deployments
contract MockStSAdapter is IStSAdapter {
    using SafeERC20 for IERC20;

    address public override sToken;
    address public override stSToken;

    constructor(address _sToken, address _stSToken) {
        sToken = _sToken;
        stSToken = _stSToken;
    }

    function stakeS(uint256 amount) external override returns (uint256) {
        IERC20(sToken).safeTransferFrom(msg.sender, address(this), amount);
        MockERC20(stSToken).mint(msg.sender, amount);
        return amount;
    }

    function unstakeToS(uint256 amount) external override returns (uint256) {
        IERC20(stSToken).safeTransferFrom(msg.sender, address(this), amount);
        MockERC20(sToken).mint(msg.sender, amount);
        return amount;
    }

    function rate() external pure override returns (uint256) {
        return 1e18;
    }
}
