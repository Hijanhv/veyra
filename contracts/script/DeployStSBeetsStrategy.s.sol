// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {StSBeetsStrategy} from "../src/strategies/StSBeetsStrategy.sol";

/// @title Deploy StSBeetsStrategy
/// @notice Deployment script for the StSBeetsStrategy contract
/// @dev Set environment variables: S_TOKEN, VAULT, STS_ADAPTER, BEETS_ADAPTER, BEETS_POOL
contract DeployStSBeetsStrategy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address sToken = vm.envAddress("S_TOKEN");
        address vault = vm.envAddress("VAULT");
        address stsAdapter = vm.envAddress("STS_ADAPTER");
        address beetsAdapter = vm.envAddress("BEETS_ADAPTER");
        address pool = vm.envAddress("BEETS_POOL");

        vm.startBroadcast(deployerPrivateKey);

        StSBeetsStrategy strategy = new StSBeetsStrategy(
            sToken,
            vault,
            stsAdapter,
            beetsAdapter,
            pool
        );

        vm.stopBroadcast();

        console2.log("StSBeetsStrategy deployed at:", address(strategy));
        console2.log("S Token:", sToken);
        console2.log("Vault:", vault);
        console2.log("StS Adapter:", stsAdapter);
        console2.log("BEETS Adapter:", beetsAdapter);
        console2.log("BEETS Pool:", pool);
    }
}
