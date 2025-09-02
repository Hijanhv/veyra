// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {SwapXManagedRangeStrategy} from "../src/strategies/SwapXManagedRangeStrategy.sol";

/// @title Deploy SwapXManagedRangeStrategy
/// @notice Deployment script for the SwapXManagedRangeStrategy contract.
/// @dev Set environment variables: S_TOKEN, VAULT, SWAPX_ADAPTER, STS_ADAPTER,
///      SWAPX_POOL, SWAPX_GAUGE. This script deploys the strategy and logs
///      its address and configuration.
contract DeploySwapXManagedRangeStrategy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address sToken = vm.envAddress("S_TOKEN");
        address vault = vm.envAddress("VAULT");
        address swapxAdapter = vm.envAddress("SWAPX_ADAPTER");
        address stsAdapter = vm.envAddress("STS_ADAPTER");
        address pool = vm.envAddress("SWAPX_POOL");
        address gauge = vm.envAddress("SWAPX_GAUGE");

        vm.startBroadcast(deployerPrivateKey);
        SwapXManagedRangeStrategy strategy = new SwapXManagedRangeStrategy(
            sToken,
            vault,
            swapxAdapter,
            stsAdapter,
            pool,
            gauge
        );
        vm.stopBroadcast();

        console2.log("SwapXManagedRangeStrategy deployed at:", address(strategy));
        console2.log("S Token:", sToken);
        console2.log("Vault:", vault);
        console2.log("SwapX Adapter:", swapxAdapter);
        console2.log("StS Adapter:", stsAdapter);
        console2.log("SwapX Pool:", pool);
        console2.log("SwapX Gauge:", gauge);
    }
}