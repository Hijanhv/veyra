#!/usr/bin/env node
// Single script: deploy mock suite with Foundry, then update addresses in
// contracts/DEPLOYED_ADDRESSES.md and server/.env.
//
// Required env:
//   SONIC_RPC_URL - RPC endpoint
//   PRIVATE_KEY   - Deployer private key (0x...)
//   CHAIN_ID      - Numeric chain id (e.g., 146)
// Optional:
//   STRATEGY_MANAGER - Manager address for vaults (falls back to deployer)
//   FEEM_PROJECT_ID  - Sonic FeeM project ID. If set, the script will
//                      post-register the deployed vault + strategies by calling
//                      their registerMe(uint256) function.

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const contractsDir = path.join(root, 'contracts');

// Try to hydrate env from contracts/.env and server/.env if present
const tryLoadEnv = (p) => {
  if (!existsSync(p)) return;
  try {
    const txt = readFileSync(p, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key] && val !== '') process.env[key] = val;
    }
  } catch { }
};

tryLoadEnv(path.join(contractsDir, '.env'));
tryLoadEnv(path.join(root, 'server', '.env'));

// Required RPC URL
const RPC_URL = process.env.SONIC_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CHAIN_ID = process.env.CHAIN_ID || process.env.chainId || process.env.chain_id || '146';
const FEEM_PROJECT_ID = process.env.FEEM_PROJECT_ID
if (!RPC_URL || !PRIVATE_KEY) {
  console.error('Usage: set SONIC_RPC_URL, PRIVATE_KEY, and CHAIN_ID. Example:\nSONIC_RPC_URL=... PRIVATE_KEY=0x... CHAIN_ID=146 node scripts/deploy-mock.mjs');
  process.exit(1);
}

// 1) Run Foundry deploy script (broadcast)
try {
  const cmd = `forge script script/DeployMockSuite.s.sol:DeployMockSuite --rpc-url "${RPC_URL}" --private-key "${PRIVATE_KEY}" --broadcast -vvvv`;
  execSync(cmd, { stdio: 'inherit', cwd: contractsDir });
} catch (e) {
  console.error('forge script failed');
  process.exit(1);
}

// 2) Parse broadcast
const broadcastPath = path.join(
  contractsDir,
  'broadcast',
  'DeployMockSuite.s.sol',
  String(CHAIN_ID),
  'run-latest.json'
);
if (!existsSync(broadcastPath)) {
  console.error(`Broadcast file not found: ${broadcastPath}`);
  process.exit(1);
}
let data;
try {
  data = JSON.parse(readFileSync(broadcastPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse broadcast JSON:', e);
  process.exit(1);
}
const txs = Array.isArray(data.transactions) ? data.transactions : [];
const deployments = txs
  .filter((t) => t.contractAddress)
  .map((t) => ({ name: t.contractName, address: t.contractAddress }))
  .filter((v, i, a) => a.findIndex((x) => x.name === v.name && x.address === v.address) === i);
if (deployments.length === 0) {
  console.error('No contract deployments found in broadcast transactions.');
  process.exit(1);
}
const vaults = deployments.filter((d) => d.name === 'VeyraVault').map((d) => d.address);
const strategies = deployments
  .filter((d) => /Strategy$/.test(d.name))
  .map((d) => d.address);

// 2b) Optionally mint initial balances of core mock tokens to a recipient (default: deployer)
//     Tokens created by DeployMockSuite are: S, stS, wS, USDC (all 18 decimals in mocks).
//     Control with env:
//       MINT_TO        - address to receive tokens (default: deployer EOA from PRIVATE_KEY)
//       MINT_AMOUNT    - uint amount in wei to mint to each token (default: 1000000e18)
//       MINT_DISABLED  - set to '1' to skip minting
if (process.env.MINT_DISABLED !== '1') {
  try {
    const mockErcs = deployments.filter((d) => d.name === 'MockERC20').map((d) => d.address);
    const wantedNames = new Set(['S', 'stS', 'wS', 'USDC']);
    const nameOf = (addr) => {
      try {
        const out = execSync(`cast call ${addr} "name()(string)" --rpc-url "${RPC_URL}"`, { cwd: contractsDir });
        return String(out).trim();
      } catch {
        return '';
      }
    };
    const symbolOf = (addr) => {
      try {
        const out = execSync(`cast call ${addr} "symbol()(string)" --rpc-url "${RPC_URL}"`, { cwd: contractsDir });
        return String(out).trim();
      } catch {
        return '';
      }
    };

    // Resolve deployer (default MINT_TO) from private key
    let recipient = (process.env.MINT_TO || '').trim();
    if (!recipient) {
      try {
        const out = execSync(`cast wallet address --private-key "${PRIVATE_KEY}"`, { cwd: contractsDir });
        recipient = String(out).trim();
      } catch {}
    }
    if (!recipient) {
      throw new Error('Failed to resolve MINT_TO or deployer address');
    }

    const defaultAmount = '1000000000000000000000000'; // 1,000,000e18
    const amount = (process.env.MINT_AMOUNT || defaultAmount).trim();

    // Identify core tokens among MockERC20s by name
    const core = [];
    for (const addr of mockErcs) {
      const nm = nameOf(addr);
      if (wantedNames.has(nm)) {
        const sym = symbolOf(addr);
        core.push({ addr, name: nm, symbol: sym || nm });
      }
    }

    if (core.length > 0) {
      console.log(`Minting initial balances to ${recipient} ...`);
      for (const t of core) {
        try {
          const cmd = `cast send ${t.addr} "mint(address,uint256)" ${recipient} ${amount} --rpc-url "${RPC_URL}" --private-key "${PRIVATE_KEY}"`;
          console.log(`  ${t.symbol} @ ${t.addr} -> ${recipient} amount ${amount}`);
          execSync(cmd, { stdio: 'inherit', cwd: contractsDir });
        } catch (e) {
          console.error(`Mint failed for ${t.symbol} (${t.addr})`);
          throw e;
        }
      }
    } else {
      console.warn('No core MockERC20 tokens (S, stS, wS, USDC) identified for minting.');
    }
  } catch (e) {
    console.error('Initial mint step failed:', e.message || e);
    process.exit(1);
  }
} else {
  console.log('MINT_DISABLED=1 — skipping initial token mint.');
}

// 3) Write contracts/DEPLOYED_ADDRESSES.md with ONLY the latest deployment
const deployedMdPath = path.join(contractsDir, 'DEPLOYED_ADDRESSES.md');
const now = new Date().toISOString();
const byName = deployments.reduce((acc, d) => { (acc[d.name] ||= []).push(d.address); return acc; }, {});
let md = '# Deployed Addresses\n\n';
md += `## Latest Deployment (chain ${CHAIN_ID}) — ${now}`;
for (const [name, addrs] of Object.entries(byName)) {
  if (addrs.length === 1) md += `\n- ${name}: ${addrs[0]}`;
  else {
    md += `\n- ${name}:`;
    addrs.forEach((a, i) => (md += `\n  - [${i}] ${a}`));
  }
}
md += '\n';
writeFileSync(deployedMdPath, md, 'utf8');
console.log(`Updated ${path.relative(root, deployedMdPath)} (latest only)`);

// 4) Update server/.env (create from example if missing)
const serverEnvPath = path.join(root, 'server', '.env');
if (!existsSync(serverEnvPath)) {
  const examplePath = path.join(root, 'server', '.env.example');
  if (existsSync(examplePath)) {
    mkdirSync(path.dirname(serverEnvPath), { recursive: true });
    copyFileSync(examplePath, serverEnvPath);
    console.log(`Created ${path.relative(root, serverEnvPath)} from .env.example`);
  } else {
    writeFileSync(serverEnvPath, '', 'utf8');
  }
}
let envText = readFileSync(serverEnvPath, 'utf8');
// Remove any existing definitions of keys we manage, then append fresh lines
const upsertEnv = (text, kv) => {
  const keys = Object.keys(kv);
  const lines = text.split(/\r?\n/).filter((ln) => !keys.some((k) => ln.startsWith(`${k}=`)));
  keys.forEach((k) => lines.push(`${k}=${kv[k]}`));
  return lines.filter(Boolean).join('\n') + '\n';
};
const kv = { CHAIN_ID: String(CHAIN_ID) };
if (vaults.length > 0) {
  kv['VAULT_ADDRESSES'] = vaults.join(',');
  kv['DEFAULT_VAULT_ID'] = vaults[0];
}
envText = upsertEnv(envText, kv);
writeFileSync(serverEnvPath, envText, 'utf8');
console.log(`Updated ${path.relative(root, serverEnvPath)} (VAULT_ADDRESSES, DEFAULT_VAULT_ID, CHAIN_ID)`);

// 5) If FEEM_PROJECT_ID is provided, call registerMe(projectId) on each target
if (FEEM_PROJECT_ID) {
  const targets = [...vaults, ...strategies];
  if (targets.length === 0) {
    console.warn('FEEM_PROJECT_ID set but no targets (vault/strategies) found to register.');
  } else {
    console.log(`Registering ${targets.length} contracts with Sonic FeeM (project ${FEEM_PROJECT_ID})...`);
    for (const addr of targets) {
      try {
        const cmd = `cast send ${addr} "registerMe(uint256)" ${FEEM_PROJECT_ID} --rpc-url "${RPC_URL}" --private-key "${PRIVATE_KEY}"`;
        execSync(cmd, { stdio: 'inherit', cwd: contractsDir });
      } catch (e) {
        console.error(`FeeM register failed for ${addr}`);
        throw e;
      }
    }
  }
} else {
  console.log('FEEM_PROJECT_ID not set — skipping FeeM registration');
}

// 6) Build contracts (no-op if unchanged) and sync ABIs to server and web after deploy
try {
  execSync('node scripts/refresh-contracts.mjs', { stdio: 'inherit', cwd: root });
} catch { /* ignore sync errors here */ }

console.log('Done.');
