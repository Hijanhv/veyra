// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {PendleFixedYieldStSStrategy} from "src/strategies/PendleFixedYieldStSStrategy.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";
import {MockPendleAdapter} from "src/mocks/MockPendleAdapter.sol";
import {MockLendingAdapter} from "src/mocks/MockLendingAdapter.sol";

contract PendleFixedYieldStSStrategyTest is Test {
    using SafeERC20 for IERC20;
    MockERC20 stS;
    address stable;
    MockPendleAdapter pendle;
    MockLendingAdapter lending;
    PendleFixedYieldStSStrategy strategy;
    address vault = address(0x9999);

    function setUp() public {
        stS = new MockERC20("stS", "stS", 18);
        pendle = new MockPendleAdapter(address(stS));
        stable = pendle.stableToken();
        lending = new MockLendingAdapter();
        // Create strategy using stS as the main asset
        strategy = new PendleFixedYieldStSStrategy(
            address(stS),
            vault,
            address(pendle),
            address(lending),
            "Pendle Fixed Yield Test"
        );
        // Give the vault some stS tokens
        stS.mint(vault, 1_000 ether);
        // Let the vault approve all necessary contracts
        vm.startPrank(vault);
        stS.approve(address(strategy), type(uint256).max);
        vm.stopPrank();
    }

    function testDeposit() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        // Send stS to strategy and deposit it
        IERC20(address(stS)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Strategy should have PT tokens equal to what we deposited
        assertEq(strategy.ptBalance(), amount);
        // Lending adapter should show stable collateral equal to the YT we sold
        assertEq(lending.collateralOf(address(strategy), stable), amount);
    }

    function testWithdrawPartial() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        IERC20(address(stS)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Try withdrawing 40 stS
        vm.startPrank(vault);
        strategy.withdraw(40 ether);
        vm.stopPrank();
        // Vault should get back 40 stS (plus the 900 remaining from before)
        assertEq(stS.balanceOf(vault), 1_000 ether - amount + 40 ether);
        // Should have 60 stable tokens left as collateral
        assertEq(lending.collateralOf(address(strategy), stable), 60 ether);
        // PT balance should still be the original amount
        assertEq(strategy.ptBalance(), amount);
    }
}
