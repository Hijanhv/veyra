// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {RingsAaveLoopStrategy} from "../src/strategies/RingsAaveLoopStrategy.sol";

/// @title Deploy RingsAaveLoopStrategy
/// @notice Deployment script for the RingsAaveLoopStrategy contract
/// @dev Set environment variables: USDC_TOKEN, VAULT, RINGS_ADAPTER, LENDING_ADAPTER, TARGET_HF, MAX_ITERATIONS
contract DeployRingsAaveLoopStrategy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_TOKEN");
        address vault = vm.envAddress("VAULT");
        address ringsAdapter = vm.envAddress("RINGS_ADAPTER");
        address lendingAdapter = vm.envAddress("LENDING_ADAPTER");
        uint256 targetHf = vm.envUint("TARGET_HF"); // e.g., 1.5e18
        uint256 maxIterations = vm.envUint("MAX_ITERATIONS"); // e.g., 3

        vm.startBroadcast(deployerPrivateKey);

        RingsAaveLoopStrategy strategy = new RingsAaveLoopStrategy(
            usdc,
            vault,
            ringsAdapter,
            lendingAdapter,
            targetHf,
            maxIterations
        );

        vm.stopBroadcast();

        console2.log("RingsAaveLoopStrategy deployed at:", address(strategy));
        console2.log("USDC Token:", usdc);
        console2.log("Vault:", vault);
        console2.log("Rings Adapter:", ringsAdapter);
        console2.log("Lending Adapter:", lendingAdapter);
        console2.log("Target Health Factor:", targetHf);
        console2.log("Max Iterations:", maxIterations);
    }
}
