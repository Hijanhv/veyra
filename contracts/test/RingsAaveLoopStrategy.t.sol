// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {RingsAaveLoopStrategy} from "src/strategies/RingsAaveLoopStrategy.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";
import {MockRingsAdapter} from "src/mocks/MockRingsAdapter.sol";
import {MockLendingAdapter} from "src/mocks/MockLendingAdapter.sol";

contract RingsAaveLoopStrategyTest is Test {
    using SafeERC20 for IERC20;
    MockERC20 usdc;
    MockRingsAdapter rings;
    MockLendingAdapter lending;
    RingsAaveLoopStrategy strategy;
    address vault = address(0xABCD);

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 18);
        rings = new MockRingsAdapter(address(usdc));
        lending = new MockLendingAdapter();
        // Start with a healthy health factor
        lending.setHealthFactor(2e18);
        // Create strategy with target health factor 1.5 and max 3 iterations
        strategy = new RingsAaveLoopStrategy(
            address(usdc),
            vault,
            address(rings),
            address(lending),
            15e17, // 1.5e18
            3
        );
        // Give vault some USDC and approve all contracts
        usdc.mint(vault, 1_000 ether);
        vm.startPrank(vault);
        usdc.approve(address(strategy), type(uint256).max);
        usdc.approve(address(rings), type(uint256).max);
        usdc.approve(address(lending), type(uint256).max);
        vm.stopPrank();
    }

    function testDepositAndWithdraw() public {
        uint256 amount = 100 ether;
        vm.startPrank(vault);
        IERC20(address(usdc)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Should have some collateral and debt after depositing
        assertGt(lending.collateralOf(address(strategy), rings.scUsd()), 0);
        assertGt(lending.debtOf(address(strategy), address(usdc)), 0);
        // Now withdraw half the amount
        vm.startPrank(vault);
        strategy.withdraw(50 ether);
        vm.stopPrank();
        // Vault should get back 50 USDC
        assertEq(usdc.balanceOf(vault), 1_000 ether - 100 ether + 50 ether);
    }
}
