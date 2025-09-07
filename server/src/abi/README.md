This directory contains contract ABIs used by the server.

- VeyraVault.json: ERC-4626 compliant vault with strategy allocations
- IYieldStrategy.json: Strategy interface with `apy`, `totalAssets`, etc.

ABIs are copied from Foundry build artifacts in `contracts/out`.

Sync commands:
- From repo root: `node scripts/refresh-contracts.mjs` (forge build + sync to `server/src/abi` and `web/src/abi`)
- From server/: `npm run abis:sync` or `npm run contracts:build` (wrappers that call the root script)

Artifacts synced: IYieldStrategy.json, VeyraVault.json, plus common adapters and strategies for tooling.
