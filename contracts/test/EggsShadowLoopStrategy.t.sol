// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {EggsShadowLoopStrategy} from "src/strategies/EggsShadowLoopStrategy.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";
import {MockEggsAdapter} from "src/mocks/MockEggsAdapter.sol";
import {MockStSAdapter} from "src/mocks/MockStSAdapter.sol";
import {MockShadowAdapter} from "src/mocks/MockShadowAdapter.sol";

contract EggsShadowLoopStrategyTest is Test {
    using SafeERC20 for IERC20;
    MockERC20 sToken;
    MockERC20 stSToken;
    MockEggsAdapter eggs;
    MockStSAdapter stsAdapter;
    MockShadowAdapter shadow;
    EggsShadowLoopStrategy strategy;
    address vault = address(0xDEAD);

    function setUp() public {
        sToken = new MockERC20("S", "S", 18);
        stSToken = new MockERC20("stS", "stS", 18);
        eggs = new MockEggsAdapter(address(sToken));
        stsAdapter = new MockStSAdapter(address(sToken), address(stSToken));
        shadow = new MockShadowAdapter(address(sToken));
        // Create strategy with 50% borrow ratio, 1.5 health factor target, no iterations
        strategy = new EggsShadowLoopStrategy(
            address(sToken),
            vault,
            address(eggs),
            address(stsAdapter),
            address(shadow),
            address(0xCAFE), // dummy pool
            address(0xBEEF), // gauge
            5000,
            15e17, // 1.5e18
            0,
            "Eggs x Shadow Loop Test"
        );
        // Give the vault some S tokens
        sToken.mint(vault, 1_000 ether);
        // act as the vault and approve all the contracts
        vm.startPrank(vault);
        sToken.approve(address(strategy), type(uint256).max);
        vm.stopPrank();
    }

    function testDeposit() public {
        uint256 amount = 100 ether;
        // send S tokens to strategy and deposit them
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        vm.stopPrank();
        // Should have about 97.5 S worth of EGGS collateral
        uint256 coll = eggs.collateralOf(address(strategy));
        // minting 100 S with 2.5% fee = 97.5 EGGS
        assertEq(coll, 97.5 ether, "incorrect eggs collateral");
        // debt should be 50% of collateral = 48.75
        uint256 debt = eggs.debtOf(address(strategy));
        assertEq(debt, 48.75 ether, "incorrect debt");
        // should have some LP tokens staked
        assertGt(strategy.stakedLp(), 0, "no LP staked");
    }

    function testWithdraw() public {
        uint256 amount = 100 ether;
        // first deposit some tokens
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        // then withdraw half of it
        strategy.withdraw(50 ether);
        vm.stopPrank();
        // vault should get back 50 S tokens
        assertEq(sToken.balanceOf(vault), 1_000 ether - amount + 50 ether);
        // all debt should be cleared after unwinding
        assertEq(eggs.debtOf(address(strategy)), 0);
        // no LP tokens should be staked anymore
        assertEq(strategy.stakedLp(), 0);
    }

    function testHarvestRewards() public {
        uint256 amount = 20 ether;
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), amount);
        strategy.deposit(amount);
        // set up some rewards and harvest them
        shadow.setReward(5 ether);
        uint256 harvested = strategy.harvest();
        vm.stopPrank();
        assertEq(harvested, 5 ether);
        // strategy should now have the rewards (S tokens)
        assertEq(sToken.balanceOf(address(strategy)), 5 ether);
    }
}
