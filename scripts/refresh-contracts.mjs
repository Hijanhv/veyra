#!/usr/bin/env node
// Build contracts with Foundry, then sync ABIs into server/src/abi and web/src/abi (single entrypoint).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

// 1) Build contracts via Foundry (no-op if unchanged)
run('sh', ['-c', 'cd contracts && forge build'], repoRoot);

// 2) Sync ABIs from contracts/out to server/src/abi and web/src/abi
const contractsOut = path.join(repoRoot, 'contracts', 'out');
const serverAbiDir = path.join(repoRoot, 'server', 'src', 'abi');
const webAbiDir = path.join(repoRoot, 'web', 'src', 'abi');

if (!fs.existsSync(contractsOut)) {
  console.error(`Contracts out directory not found: ${contractsOut}`);
  process.exit(1);
}
fs.mkdirSync(serverAbiDir, { recursive: true });
fs.mkdirSync(webAbiDir, { recursive: true });

const includeTargetPrefixes = [
  'src/VeyraVault.sol',
  'src/strategies/',
  'src/interfaces/',
];

function shouldIncludeByMeta(metadataVal) {
  try {
    const meta = typeof metadataVal === 'string' ? JSON.parse(metadataVal) : metadataVal;
    const targets = Object.keys(meta?.settings?.compilationTarget || {});
    return targets.some((t) => includeTargetPrefixes.some((p) => t === p || t.startsWith(p)));
  } catch {
    return false;
  }
}

function findJsonFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findJsonFiles(p));
    else if (e.isFile() && e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

const files = findJsonFiles(contractsOut);
const selected = [];
const seen = new Set();

for (const filePath of files) {
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!json || !json.abi || !Array.isArray(json.abi)) continue;
    if (!json.metadata || !shouldIncludeByMeta(json.metadata)) continue;
    const base = path.basename(filePath);
    if (seen.has(base)) continue;
    seen.add(base);
    selected.push({ base, filePath });
  } catch { }
}

// Remove stale files in server/src/abi (keep README.md)
const keepServer = new Set(selected.map((s) => s.base));
let removedServer = 0;
for (const entry of fs.existsSync(serverAbiDir) ? fs.readdirSync(serverAbiDir) : []) {
  if (entry === 'README.md') continue;
  if (entry.endsWith('.json') && !keepServer.has(entry)) {
    try { fs.unlinkSync(path.join(serverAbiDir, entry)); removedServer++; } catch { }
  }
}

// Copy selection into server/src/abi
let copiedServer = 0;
for (const { base, filePath } of selected) {
  fs.copyFileSync(filePath, path.join(serverAbiDir, base));
  copiedServer++;
}

// Mirror into web/src/abi
const serverFiles = fs.readdirSync(serverAbiDir).filter((f) => f.endsWith('.json'));
const keepWeb = new Set(serverFiles);
let removedWeb = 0;
for (const entry of fs.readdirSync(webAbiDir)) {
  if (!entry.endsWith('.json')) continue;
  if (!keepWeb.has(entry)) {
    try { fs.unlinkSync(path.join(webAbiDir, entry)); removedWeb++; } catch { }
  }
}
let copiedWeb = 0;
for (const f of serverFiles) {
  fs.copyFileSync(path.join(serverAbiDir, f), path.join(webAbiDir, f));
  copiedWeb++;
}

console.log(`Synced ${copiedServer} ABI files to ${path.relative(repoRoot, serverAbiDir)} (removed ${removedServer})`);
console.log(`Synced ${copiedWeb} ABI files to ${path.relative(repoRoot, webAbiDir)} (removed ${removedWeb})`);

console.log('Contracts built and ABIs synced to server and web.');
