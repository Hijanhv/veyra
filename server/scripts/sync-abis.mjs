#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// Dynamically sync ABIs from contracts/out to server/src/abi. Copies only the ABIs we actually need: vault, strategies,
// and adapter interfaces used by the server.

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const contractsOut = path.join(repoRoot, 'contracts', 'out');
const serverAbiDir = path.join(repoRoot, 'server', 'src', 'abi');

if (!fs.existsSync(contractsOut)) {
  console.error(`Contracts out directory not found: ${contractsOut}`);
  process.exit(1);
}
fs.mkdirSync(serverAbiDir, { recursive: true });

const includeTargetPrefixes = [
  'src/VeyraVault.sol',
  'src/strategies/',
  'src/interfaces/', // include all interfaces (covers IYieldStrategy, adapters, IStrategyIntrospection)
];

function shouldIncludeByMeta(metadataVal) {
  try {
    const meta = typeof metadataVal === 'string' ? JSON.parse(metadataVal) : metadataVal;
    const targets = Object.keys(meta?.settings?.compilationTarget || {});
    // Only include if this artifact's own compilation target lives under allowed paths
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
    if (e.isDirectory()) {
      out.push(...findJsonFiles(p));
    } else if (e.isFile() && e.name.endsWith('.json')) {
      out.push(p);
    }
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
    if (seen.has(base)) continue; // prefer first match
    seen.add(base);
    selected.push({ base, filePath });
  } catch {
    // skip unreadable/invalid JSON
  }
}

// Remove stale ABI files not in selection (keep README.md if present)
const keep = new Set(selected.map((s) => s.base));
let removed = 0;
for (const entry of fs.existsSync(serverAbiDir) ? fs.readdirSync(serverAbiDir) : []) {
  const p = path.join(serverAbiDir, entry);
  if (entry === 'README.md') continue;
  if (entry.endsWith('.json') && !keep.has(entry)) {
    try { fs.unlinkSync(p); removed++; } catch {}
  }
}

// Copy selected
let copied = 0;
for (const { base, filePath } of selected) {
  const dest = path.join(serverAbiDir, base);
  fs.copyFileSync(filePath, dest);
  copied++;
}

console.log(`Synced ${copied} ABI files to ${serverAbiDir} (removed ${removed} stale files)`);
