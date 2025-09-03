// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {PendleFixedYieldStSStrategy} from "../src/strategies/PendleFixedYieldStSStrategy.sol";

/// @title Deploy PendleFixedYieldStSStrategy
/// @notice Deployment script for the PendleFixedYieldStSStrategy contract.
/// @dev Set environment variables: PRIVATE_KEY, STS_TOKEN, VAULT,
///      PENDLE_ADAPTER, STABLE_LENDING_ADAPTER.  The script deploys
///      the strategy using the provided addresses and logs the
///      deployment details.
contract DeployPendleFixedYieldStSStrategy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address stSToken = vm.envAddress("STS_TOKEN");
        address vault = vm.envAddress("VAULT");
        address pendleAdapter = vm.envAddress("PENDLE_ADAPTER");
        address lendingAdapter = vm.envAddress("STABLE_LENDING_ADAPTER");

        vm.startBroadcast(deployerPrivateKey);

        PendleFixedYieldStSStrategy strategy = new PendleFixedYieldStSStrategy(
            stSToken,
            vault,
            pendleAdapter,
            lendingAdapter
        );

        vm.stopBroadcast();

        console2.log("PendleFixedYieldStSStrategy deployed at:", address(strategy));
        console2.log("stS Token:", stSToken);
        console2.log("Vault:", vault);
        console2.log("Pendle Adapter:", pendleAdapter);
        console2.log("Stable Lending Adapter:", lendingAdapter);
    }
}
