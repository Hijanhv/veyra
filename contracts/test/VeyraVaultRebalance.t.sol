// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import {VeyraVault} from "src/VeyraVault.sol";
import {BaseStrategy} from "src/strategies/BaseStrategy.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";

/// @notice Minimal holding strategy used for rebalancing tests.
/// It simply accounts balances and sends assets back to the vault on withdraw.
contract HoldStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    uint256 private _bal;

    constructor(address asset_, address vault_, string memory name_) BaseStrategy(asset_, vault_, name_) {}

    function deposit(uint256 amount) external override onlyVault nonReentrant {
        require(ASSET.balanceOf(address(this)) >= amount, "need funds");
        _bal += amount;
    }

    function withdraw(uint256 amount) external override onlyVault nonReentrant {
        if (amount > _bal) amount = _bal;
        _bal -= amount;
        ASSET.safeTransfer(VAULT, amount);
    }

    function harvest()
        external
        override
        onlyVault
        nonReentrant
        returns (uint256)
    {
        return 0;
    }

    function totalAssets() external view override returns (uint256) {
        return _bal;
    }

    function apy() external pure override returns (uint256) {
        return 0; // not relevant for this test
    }
}

contract VeyraVaultRebalanceTest is Test {
    using SafeERC20 for IERC20;

    MockERC20 asset;
    VeyraVault vault;
    HoldStrategy stratA;
    HoldStrategy stratB;

    address manager = address(this); // set test contract as strategy manager

    function setUp() public {
        // 18-decimal test token
        asset = new MockERC20("TestAsset", "TAS", 18);
        // Vault with this contract as strategyManager
        vault = new VeyraVault(
            IERC20(address(asset)),
            "Veyra Vault TAS",
            "vTAS",
            manager
        );

        // Deploy two simple hold strategies
        stratA = new HoldStrategy(address(asset), address(vault), "Hold A");
        stratB = new HoldStrategy(address(asset), address(vault), "Hold B");

        // Owner is this test contract by default; add strategies with initial allocations 70% / 30%
        vault.addStrategy(stratA, 7000);
        vault.addStrategy(stratB, 3000);

        // Mint 100 tokens to depositor (this contract) and approve vault
        asset.mint(address(this), 100 ether);
        IERC20(address(asset)).approve(address(vault), type(uint256).max);
    }

    function testDepositFollowsAllocations() public {
        // Deposit 100 tokens; vault should deploy according to 70/30
        vault.deposit(100 ether, address(this));

        // Check strategy balances
        assertEq(
            stratA.totalAssets(),
            70 ether,
            "stratA should have 70% after deposit"
        );
        assertEq(
            stratB.totalAssets(),
            30 ether,
            "stratB should have 30% after deposit"
        );
        assertEq(
            IERC20(address(asset)).balanceOf(address(vault)),
            0,
            "idle should be zero after deployment"
        );
    }

    function testRebalanceMovesFundsToMatchSavedBps() public {
        // Initial deposit according to 70/30
        vault.deposit(100 ether, address(this));

        // Now change target to 20/80 and trigger on-chain rebalance
        uint256[] memory target = new uint256[](2);
        target[0] = 2000; // 20%
        target[1] = 8000; // 80%
        vault.rebalance(target);

        // After rebalance: desired A=20, B=80; no idle expected
        assertEq(
            stratA.totalAssets(),
            20 ether,
            "stratA should be rebalanced to 20%"
        );
        assertEq(
            stratB.totalAssets(),
            80 ether,
            "stratB should be rebalanced to 80%"
        );
        assertEq(
            IERC20(address(asset)).balanceOf(address(vault)),
            0,
            "idle should be zero after rebalance"
        );
    }

    function testRebalanceLeavesIdleIfTotalAllocationLt100() public {
        // Deposit 100 tokens on 100% to A (set to 10000/0)
        // Reconfigure allocations first
        uint256[] memory oneHundredToA = new uint256[](2);
        oneHundredToA[0] = 10000;
        oneHundredToA[1] = 0;
        vault.rebalance(oneHundredToA);

        vault.deposit(100 ether, address(this));
        assertEq(stratA.totalAssets(), 100 ether, "all funds to A");
        assertEq(stratB.totalAssets(), 0, "none to B");

        // Now set target to 50% total (5000/0); expect 50 in A, 50 idle
        uint256[] memory halfTotal = new uint256[](2);
        halfTotal[0] = 5000;
        halfTotal[1] = 0;
        vault.rebalance(halfTotal);

        assertEq(stratA.totalAssets(), 50 ether, "A at 50%");
        assertEq(stratB.totalAssets(), 0, "B still 0");
        assertEq(
            IERC20(address(asset)).balanceOf(address(vault)),
            50 ether,
            "idle holds the rest"
        );
    }
}
