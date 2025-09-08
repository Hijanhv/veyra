// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {StSBeetsStrategy} from "src/strategies/StSBeetsStrategy.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";
import {MockStSAdapter} from "src/mocks/MockStSAdapter.sol";
import {MockBeetsAdapter} from "src/mocks/MockBeetsAdapter.sol";

contract StSBeetsStrategyTest is Test {
    using SafeERC20 for IERC20;
    MockERC20 sToken;
    MockERC20 stSToken;
    MockStSAdapter stsAdapter;
    MockBeetsAdapter beetsAdapter;
    StSBeetsStrategy strategy;
    address vault = address(0x1234);

    function setUp() public {
        // create our test tokens
        sToken = new MockERC20("S", "S", 18);
        stSToken = new MockERC20("stS", "stS", 18);
        stsAdapter = new MockStSAdapter(address(sToken), address(stSToken));
        beetsAdapter = new MockBeetsAdapter(address(sToken));
        // create the strategy
        strategy = new StSBeetsStrategy(
            address(sToken),
            vault,
            address(stsAdapter),
            address(beetsAdapter),
            address(0xBEEF), // fake pool for testing
            "StS + Beets LP Test"
        );
        // give vault some S tokens
        sToken.mint(vault, 1_000 ether);
        // act as the vault for testing
        vm.startPrank(vault);
        // let strategy and adapters spend tokens
        sToken.approve(address(strategy), type(uint256).max);
        sToken.approve(address(stsAdapter), type(uint256).max);
        sToken.approve(address(beetsAdapter), type(uint256).max);
        stSToken.approve(address(stsAdapter), type(uint256).max);
        stSToken.approve(address(beetsAdapter), type(uint256).max);
        vm.stopPrank();
    }

    function testDepositAndWithdraw() public {
        // vault puts in 100 S tokens
        uint256 depositAmount = 100 ether;
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), depositAmount);
        strategy.deposit(depositAmount);
        vm.stopPrank();
        // should have some LP tokens staked
        assertGt(strategy.stakedLp(), 0);
        // vault takes out 50 S tokens
        vm.startPrank(vault);
        strategy.withdraw(50 ether);
        vm.stopPrank();
        // vault should get back 50 S tokens
        assertEq(sToken.balanceOf(vault), 1_000 ether - 100 ether + 50 ether);
    }

    function testHarvestRewards() public {
        // first deposit to create an LP position
        uint256 depositAmount = 20 ether;
        vm.startPrank(vault);
        IERC20(address(sToken)).safeTransfer(address(strategy), depositAmount);
        strategy.deposit(depositAmount);
        vm.stopPrank();
        // set up rewards and harvest them
        beetsAdapter.setReward(5 ether);
        vm.startPrank(vault);
        uint256 harvested = strategy.harvest();
        vm.stopPrank();
        assertEq(harvested, 5 ether);
        // strategy should now have the rewards
        assertEq(sToken.balanceOf(address(strategy)), 5 ether);
    }
}
