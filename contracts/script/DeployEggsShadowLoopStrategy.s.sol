// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {EggsShadowLoopStrategy} from "../src/strategies/EggsShadowLoopStrategy.sol";

/// @title Deploy EggsShadowLoopStrategy
/// @notice Deployment script for the EggsShadowLoopStrategy contract
/// @dev Set environment variables: S_TOKEN, VAULT, EGGS_ADAPTER, STS_ADAPTER,
/// SHADOW_ADAPTER, POOL, GAUGE, BORROW_RATIO, TARGET_HF, MAX_ITERATIONS.
contract DeployEggsShadowLoopStrategy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address sToken = vm.envAddress("S_TOKEN");
        address vault = vm.envAddress("VAULT");
        address eggsAdapter = vm.envAddress("EGGS_ADAPTER");
        address stsAdapter = vm.envAddress("STS_ADAPTER");
        address shadowAdapter = vm.envAddress("SHADOW_ADAPTER");
        address pool = vm.envAddress("POOL");
        address gauge = vm.envAddress("GAUGE");
        uint256 borrowRatio = vm.envUint("BORROW_RATIO");
        uint256 targetHf = vm.envUint("TARGET_HF");
        uint256 maxIter = vm.envUint("MAX_ITERATIONS");

        vm.startBroadcast(deployerPrivateKey);

        EggsShadowLoopStrategy strategy = new EggsShadowLoopStrategy(
            sToken,
            vault,
            eggsAdapter,
            stsAdapter,
            shadowAdapter,
            pool,
            gauge,
            borrowRatio,
            targetHf,
            maxIter
        );

        vm.stopBroadcast();

        console2.log("EggsShadowLoopStrategy deployed at:", address(strategy));
        console2.log("S Token:", sToken);
        console2.log("Vault:", vault);
        console2.log("Eggs Adapter:", eggsAdapter);
        console2.log("StS Adapter:", stsAdapter);
        console2.log("Shadow Adapter:", shadowAdapter);
        console2.log("Pool:", pool);
        console2.log("Gauge:", gauge);
        console2.log("Borrow Ratio (bps):", borrowRatio);
        console2.log("Target Health Factor:", targetHf);
        console2.log("Max Iterations:", maxIter);
    }
}
