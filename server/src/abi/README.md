This directory contains contract ABIs used by the server.

- VeyraVault.json: ERC-4626 compliant vault with strategy allocations
- IYieldStrategy.json: Strategy interface with `apy`, `totalAssets`, etc.

ABIs are copied from Foundry build artifacts in `contracts/out`.

Sync commands:
- From server/: `npm run sync:abis` (copy only)
- From server/: `npm run contracts:build` (forge build + copy)

Artifacts synced: IYieldStrategy.json, VeyraVault.json, plus common adapters and strategies for tooling.
