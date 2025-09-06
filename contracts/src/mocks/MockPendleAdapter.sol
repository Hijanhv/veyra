// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPendleAdapter} from "../interfaces/adapters/IPendleAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

/// @title MockPendleAdapter
/// @notice Minimal Pendle adapter mock for fixed-yield strategy wiring
contract MockPendleAdapter is IPendleAdapter {
    using SafeERC20 for IERC20;

    MockERC20 public immutable UNDERLYING; // e.g., stS
    MockERC20 public immutable STABLE; // e.g., scUSD
    MockERC20 public pt;
    MockERC20 public yt;

    constructor(address _underlying) {
        UNDERLYING = MockERC20(_underlying);
        STABLE = new MockERC20("scUSD", "scUSD", 18);
        pt = new MockERC20("PT", "PT", 18);
        yt = new MockERC20("YT", "YT", 18);
    }

    function splitAsset(
        uint256 amount
    ) external override returns (uint256 ptAmount, uint256 ytAmount) {
        IERC20(address(UNDERLYING)).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
        ptAmount = amount;
        ytAmount = amount;
        pt.mint(msg.sender, ptAmount);
        yt.mint(msg.sender, ytAmount);
    }

    function redeemPrincipal(
        uint256 ptAmount
    ) external override returns (uint256 underlyingAmount) {
        IERC20(address(pt)).safeTransferFrom(
            msg.sender,
            address(this),
            ptAmount
        );
        UNDERLYING.mint(msg.sender, ptAmount);
        return ptAmount;
    }

    function sellYtForStable(
        uint256 ytAmount
    ) external override returns (uint256 stableAmount) {
        IERC20(address(yt)).safeTransferFrom(
            msg.sender,
            address(this),
            ytAmount
        );
        stableAmount = ytAmount;
        STABLE.mint(msg.sender, stableAmount);
    }

    function stableToUnderlying(
        uint256 stableAmount
    ) external override returns (uint256 underlyingAmount) {
        IERC20(address(STABLE)).safeTransferFrom(
            msg.sender,
            address(this),
            stableAmount
        );
        UNDERLYING.mint(msg.sender, stableAmount);
        return stableAmount;
    }

    function stableToken() external view override returns (address) {
        return address(STABLE);
    }

    function ytToken() external view override returns (address) {
        return address(yt);
    }

    function ptToken() external view override returns (address) {
        return address(pt);
    }
}
