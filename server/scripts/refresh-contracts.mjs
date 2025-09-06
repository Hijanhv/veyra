#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

// 1) Build contracts via Foundry
run('sh', ['-c', 'cd contracts && forge build'], repoRoot);

// 2) Sync ABIs dynamically into server/src/abi
run('node', ['./scripts/sync-abis.mjs'], path.join(repoRoot, 'server'));

console.log('Contracts refreshed: built and ABIs synced.');
