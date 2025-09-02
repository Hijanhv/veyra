// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {StSBeetsStrategy} from "../src/strategies/StSBeetsStrategy.sol";
import {AaveRingsCarryStrategy} from "../src/strategies/AaveRingsCarryStrategy.sol";
import {RingsAaveLoopStrategy} from "../src/strategies/RingsAaveLoopStrategy.sol";

/// @title Deploy All Strategies
/// @notice Master deployment script for all Veyra strategies
/// @dev This script deploys all three main strategies in sequence
contract DeployAllStrategies is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address vault = vm.envAddress("VAULT");

        // Common tokens
        address sToken = vm.envAddress("S_TOKEN");
        address usdc = vm.envAddress("USDC_TOKEN");
        address wsToken = vm.envAddress("WS_TOKEN");

        // Adapters
        address stsAdapter = vm.envAddress("STS_ADAPTER");
        address beetsAdapter = vm.envAddress("BEETS_ADAPTER");
        address ringsAdapter = vm.envAddress("RINGS_ADAPTER");
        address lendingAdapter = vm.envAddress("LENDING_ADAPTER");

        // Strategy-specific parameters
        address beetsPool = vm.envAddress("BEETS_POOL");
        uint256 borrowRatio = vm.envUint("BORROW_RATIO"); // Default: 5000 (50%)
        uint256 targetHF = vm.envUint("TARGET_HF"); // Default: 1.5e18
        uint256 maxIterations = vm.envUint("MAX_ITERATIONS"); // Default: 3

        vm.startBroadcast(deployerPrivateKey);

        console2.log("Deploying all Veyra strategies...");
        console2.log("Vault:", vault);
        console2.log("");

        // Deploy StSBeetsStrategy
        console2.log("1. Deploying StSBeetsStrategy...");
        StSBeetsStrategy stSBeetsStrategy = new StSBeetsStrategy(
            sToken,
            vault,
            stsAdapter,
            beetsAdapter,
            beetsPool
        );
        console2.log("   StSBeetsStrategy deployed at:", address(stSBeetsStrategy));
        console2.log("");

        // Deploy AaveRingsCarryStrategy
        console2.log("2. Deploying AaveRingsCarryStrategy...");
        AaveRingsCarryStrategy carryStrategy = new AaveRingsCarryStrategy(
            wsToken,
            vault,
            lendingAdapter,
            ringsAdapter,
            usdc,
            borrowRatio
        );
        console2.log("   AaveRingsCarryStrategy deployed at:", address(carryStrategy));
        console2.log("");

        // Deploy RingsAaveLoopStrategy
        console2.log("3. Deploying RingsAaveLoopStrategy...");
        RingsAaveLoopStrategy loopStrategy = new RingsAaveLoopStrategy(
            usdc,
            vault,
            ringsAdapter,
            lendingAdapter,
            targetHF,
            maxIterations
        );
        console2.log("   RingsAaveLoopStrategy deployed at:", address(loopStrategy));
        console2.log("");

        vm.stopBroadcast();

        console2.log("All strategies deployed successfully!");
        console2.log("Summary:");
        console2.log("  StSBeetsStrategy:         ", address(stSBeetsStrategy));
        console2.log("  AaveRingsCarryStrategy:   ", address(carryStrategy));
        console2.log("  RingsAaveLoopStrategy:    ", address(loopStrategy));
    }
}