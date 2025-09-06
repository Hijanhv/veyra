// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {VeyraVault} from "../src/VeyraVault.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockStSAdapter} from "../src/mocks/MockStSAdapter.sol";
import {MockBeetsAdapter} from "../src/mocks/MockBeetsAdapter.sol";
import {MockSwapXAdapter} from "../src/mocks/MockSwapXAdapter.sol";
import {MockRingsAdapter} from "../src/mocks/MockRingsAdapter.sol";
import {MockLendingAdapter} from "../src/mocks/MockLendingAdapter.sol";
import {MockPendleAdapter} from "../src/mocks/MockPendleAdapter.sol";
import {MockEggsAdapter} from "../src/mocks/MockEggsAdapter.sol";
import {MockShadowAdapter} from "../src/mocks/MockShadowAdapter.sol";

import {StSBeetsStrategy} from "../src/strategies/StSBeetsStrategy.sol";
import {AaveRingsCarryStrategy} from "../src/strategies/AaveRingsCarryStrategy.sol";
import {RingsAaveLoopStrategy} from "../src/strategies/RingsAaveLoopStrategy.sol";
import {PendleFixedYieldStSStrategy} from "../src/strategies/PendleFixedYieldStSStrategy.sol";
import {SwapXManagedRangeStrategy} from "../src/strategies/SwapXManagedRangeStrategy.sol";
import {EggsShadowLoopStrategy} from "../src/strategies/EggsShadowLoopStrategy.sol";

/**
 * @title DeployMockSuite
 * @notice Deploys mock tokens, adapters, per-asset VeyraVaults, and all strategies on Sonic.
 *         Wires strategies to mocks and registers them with their matching vaults using simple allocations.
 *
 * Env:
 *  - PRIVATE_KEY: deployer key
 *  - STRATEGY_MANAGER (optional): defaults to deployer EOA
 */
contract DeployMockSuite is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address manager;
        try vm.envAddress("STRATEGY_MANAGER") returns (address m) {
            manager = m;
        } catch {
            manager = vm.addr(pk);
        }

        // Strategy params (simple defaults)
        uint256 borrowRatio = 5000; // 50%
        uint256 targetHf = 15e17; // 1.5e18
        uint256 maxIter = 3;

        vm.startBroadcast(pk);

        // 1) Tokens
        MockERC20 sToken = new MockERC20("S", "S", 18);
        MockERC20 stSToken = new MockERC20("stS", "stS", 18);
        MockERC20 wSToken = new MockERC20("wS", "wS", 18);
        MockERC20 usdc = new MockERC20("USDC", "USDC", 18);

        console2.log("Tokens:");
        console2.log("  S:    ", address(sToken));
        console2.log("  stS:  ", address(stSToken));
        console2.log("  wS:   ", address(wSToken));
        console2.log("  USDC: ", address(usdc));
        console2.log("");

        // 2) Adapters (mocks)
        MockStSAdapter stsAdapter = new MockStSAdapter(
            address(sToken),
            address(stSToken)
        );
        MockBeetsAdapter beetsAdapter = new MockBeetsAdapter(address(sToken));
        MockSwapXAdapter swapxAdapter = new MockSwapXAdapter(address(sToken));
        MockRingsAdapter ringsAdapter = new MockRingsAdapter(address(usdc));
        MockLendingAdapter lendingAdapter = new MockLendingAdapter();
        MockPendleAdapter pendleAdapter = new MockPendleAdapter(
            address(stSToken)
        );
        MockEggsAdapter eggsAdapter = new MockEggsAdapter(address(sToken));
        MockShadowAdapter shadowAdapter = new MockShadowAdapter(
            address(sToken)
        );

        console2.log("Adapters:");
        console2.log("  StS:     ", address(stsAdapter));
        console2.log("  BEETS:   ", address(beetsAdapter));
        console2.log("  SwapX:   ", address(swapxAdapter));
        console2.log("  Rings:   ", address(ringsAdapter));
        console2.log("  Lending: ", address(lendingAdapter));
        console2.log("  Pendle:  ", address(pendleAdapter));
        console2.log("  Eggs:    ", address(eggsAdapter));
        console2.log("  Shadow:  ", address(shadowAdapter));
        console2.log("");

        // 3) Vaults (per base asset)
        VeyraVault vaultS = new VeyraVault(
            sToken,
            "Veyra Vault S",
            "vS",
            manager
        );
        VeyraVault vaultWs = new VeyraVault(
            wSToken,
            "Veyra Vault wS",
            "vwS",
            manager
        );
        VeyraVault vaultUsdc = new VeyraVault(
            usdc,
            "Veyra Vault USDC",
            "vUSDC",
            manager
        );
        VeyraVault vaultStS = new VeyraVault(
            stSToken,
            "Veyra Vault stS",
            "vstS",
            manager
        );

        console2.log("Vaults:");
        console2.log("  vaultS:   ", address(vaultS));
        console2.log("  vaultWS:  ", address(vaultWs));
        console2.log("  vaultUSDC:", address(vaultUsdc));
        console2.log("  vaultStS: ", address(vaultStS));
        console2.log("");

        // 4) Strategies
        // 4a) S-token strategies sharing vaultS
        // BEETS pool is a dummy placeholder; adapter ignores concrete value
        address beetsPool = address(0xCAFE);
        StSBeetsStrategy stSBeets = new StSBeetsStrategy(
            address(sToken),
            address(vaultS),
            address(stsAdapter),
            address(beetsAdapter),
            beetsPool
        );

        // SwapX managed range (pool + gauge placeholders)
        address swapxPool = address(0xF00D);
        address swapxGauge = address(0xC0FFEE);
        SwapXManagedRangeStrategy swapxStrat = new SwapXManagedRangeStrategy(
            address(sToken),
            address(vaultS),
            address(swapxAdapter),
            address(stsAdapter),
            swapxPool,
            swapxGauge
        );

        // Eggs + Shadow loop on S
        address shadowPool = address(0xBEEF);
        address shadowGauge = address(0xFACE);
        EggsShadowLoopStrategy eggsShadow = new EggsShadowLoopStrategy(
            address(sToken),
            address(vaultS),
            address(eggsAdapter),
            address(stsAdapter),
            address(shadowAdapter),
            shadowPool,
            shadowGauge,
            borrowRatio,
            targetHf,
            0 // no extra leverage loops beyond initial step
        );

        // 4b) wS: Aave + Rings carry
        AaveRingsCarryStrategy carry = new AaveRingsCarryStrategy(
            address(wSToken),
            address(vaultWs),
            address(lendingAdapter),
            address(ringsAdapter),
            address(usdc),
            borrowRatio
        );

        // 4c) USDC: Rings + Aave loop
        RingsAaveLoopStrategy loop = new RingsAaveLoopStrategy(
            address(usdc),
            address(vaultUsdc),
            address(ringsAdapter),
            address(lendingAdapter),
            targetHf,
            maxIter
        );

        // 4d) stS: Pendle fixed yield
        PendleFixedYieldStSStrategy pendleFix = new PendleFixedYieldStSStrategy(
            address(stSToken),
            address(vaultStS),
            address(pendleAdapter),
            address(lendingAdapter)
        );

        console2.log("Strategies:");
        console2.log("  StSBeets:       ", address(stSBeets));
        console2.log("  SwapXManaged:    ", address(swapxStrat));
        console2.log("  EggsShadowLoop:  ", address(eggsShadow));
        console2.log("  AaveRingsCarry:  ", address(carry));
        console2.log("  RingsAaveLoop:   ", address(loop));
        console2.log("  PendleFixedStS:  ", address(pendleFix));
        console2.log("");

        // 5) Register strategies with vaults
        // vaultS has 3 strategies -> split ~ equally
        vaultS.addStrategy(stSBeets, 3333);
        vaultS.addStrategy(swapxStrat, 3333);
        vaultS.addStrategy(eggsShadow, 3334);
        // single-strategy vaults get 100% allocation
        vaultWs.addStrategy(carry, 10000);
        vaultUsdc.addStrategy(loop, 10000);
        vaultStS.addStrategy(pendleFix, 10000);

        vm.stopBroadcast();

        console2.log("Deployment complete (mock suite on Sonic)");
    }
}
