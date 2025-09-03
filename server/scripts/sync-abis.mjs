#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const contractsOut = path.join(repoRoot, 'contracts', 'out');
const serverAbiDir = path.join(repoRoot, 'server', 'src', 'abi');

const artifacts = [
  ['IYieldStrategy.sol', 'IYieldStrategy.json'],
  ['VeyraVault.sol', 'VeyraVault.json'],
  // Adapters (optional, useful for tooling)
  ['ILendingAdapter.sol', 'ILendingAdapter.json'],
  ['IEggsAdapter.sol', 'IEggsAdapter.json'],
  ['IBeetsAdapter.sol', 'IBeetsAdapter.json'],
  ['ISwapXAdapter.sol', 'ISwapXAdapter.json'],
  ['IShadowAdapter.sol', 'IShadowAdapter.json'],
  ['IRingsAdapter.sol', 'IRingsAdapter.json'],
  ['IPendleAdapter.sol', 'IPendleAdapter.json'],
  // Strategies (optional, for richer clients)
  ['StSBeetsStrategy.sol', 'StSBeetsStrategy.json'],
  ['SwapXManagedRangeStrategy.sol', 'SwapXManagedRangeStrategy.json'],
  ['EggsShadowLoopStrategy.sol', 'EggsShadowLoopStrategy.json'],
  ['AaveRingsCarryStrategy.sol', 'AaveRingsCarryStrategy.json'],
  ['RingsAaveLoopStrategy.sol', 'RingsAaveLoopStrategy.json'],
  ['PendleFixedYieldStSStrategy.sol', 'PendleFixedYieldStSStrategy.json'],
  ['BaseStrategy.sol', 'BaseStrategy.json']
];

if (!fs.existsSync(contractsOut)) {
  console.error(`Contracts out directory not found: ${contractsOut}`);
  process.exit(1);
}
fs.mkdirSync(serverAbiDir, { recursive: true });

let copied = 0;
for (const [folder, file] of artifacts) {
  const src = path.join(contractsOut, folder, file);
  const dest = path.join(serverAbiDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    copied++;
  }
}

console.log(`Synced ${copied} ABI files to ${serverAbiDir}`);

