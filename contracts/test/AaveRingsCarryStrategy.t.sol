// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {AaveRingsCarryStrategy} from "src/strategies/AaveRingsCarryStrategy.sol";
import {MockRingsAdapter} from "src/mocks/MockRingsAdapter.sol";
import {MockLendingAdapter} from "src/mocks/MockLendingAdapter.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";

contract AaveRingsCarryStrategyTest is Test {
    using SafeERC20 for IERC20;
    MockERC20 wS;
    MockERC20 usdc;
    MockRingsAdapter rings;
    MockLendingAdapter lend;
    AaveRingsCarryStrategy strategy;
    address vault = address(0x1111);

    function setUp() public {
        wS = new MockERC20("wS", "wS", 18);
        usdc = new MockERC20("USDC", "USDC", 18);
        rings = new MockRingsAdapter(address(usdc));
        lend = new MockLendingAdapter();
        // Set borrow ratio to 50% (5000 basis points)
        strategy = new AaveRingsCarryStrategy(
            address(wS),
            vault,
            address(lend),
            address(rings),
            address(usdc),
            5000
        );
        // Give the vault some tokens and approve the strategy to spend them
        wS.mint(vault, 1000 ether);
        // No need to pre-fund lending; borrow mints tokens in mock
        vm.startPrank(vault);
        wS.approve(address(strategy), type(uint256).max);
        usdc.approve(address(rings), type(uint256).max);
        usdc.approve(address(lend), type(uint256).max);
        vm.stopPrank();
    }

    function testDeposit() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        // Send wS tokens to the strategy
        IERC20(address(wS)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Verify the strategy deposited collateral and borrowed correctly
        assertEq(lend.collateralOf(address(strategy), address(wS)), amount);
        // Should have borrowed USDC equal to half the deposit amount
        assertEq(lend.debtOf(address(strategy), address(usdc)), amount / 2);
        // scUSD balance should match the amount we borrowed
        assertEq(
            IERC20(rings.scUsd()).balanceOf(address(strategy)),
            amount / 2
        );
    }

    function testWithdraw() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        IERC20(address(wS)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        // Try withdrawing half the amount
        strategy.withdraw(50 ether);
        vm.stopPrank();
        // The vault should get back exactly 50 wS tokens
        assertEq(wS.balanceOf(vault), 1000 ether - amount + 50 ether);
        // All debt should be cleared after redeeming scUSD and repaying
        assertEq(lend.debtOf(address(strategy), address(usdc)), 0);
    }
}
