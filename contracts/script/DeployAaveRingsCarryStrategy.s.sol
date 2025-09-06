// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {AaveRingsCarryStrategy} from "../src/strategies/AaveRingsCarryStrategy.sol";

/// @title Deploy AaveRingsCarryStrategy
/// @notice Deployment script for the AaveRingsCarryStrategy contract
/// @dev Set environment variables: WS_TOKEN, VAULT, LENDING_ADAPTER, RINGS_ADAPTER, USDC_TOKEN, BORROW_RATIO
contract DeployAaveRingsCarryStrategy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address wsToken = vm.envAddress("WS_TOKEN");
        address vault = vm.envAddress("VAULT");
        address lendingAdapter = vm.envAddress("LENDING_ADAPTER");
        address ringsAdapter = vm.envAddress("RINGS_ADAPTER");
        address usdc = vm.envAddress("USDC_TOKEN");
        uint256 borrowRatio = vm.envUint("BORROW_RATIO"); // e.g., 5000 for 50%

        vm.startBroadcast(deployerPrivateKey);

        AaveRingsCarryStrategy strategy = new AaveRingsCarryStrategy(
            wsToken,
            vault,
            lendingAdapter,
            ringsAdapter,
            usdc,
            borrowRatio
        );

        vm.stopBroadcast();

        console2.log("AaveRingsCarryStrategy deployed at:", address(strategy));
        console2.log("wS Token:", wsToken);
        console2.log("Vault:", vault);
        console2.log("Lending Adapter:", lendingAdapter);
        console2.log("Rings Adapter:", ringsAdapter);
        console2.log("USDC Token:", usdc);
        console2.log("Borrow Ratio (bps):", borrowRatio);
    }
}
