# Veyra Protocol

AI‑powered yield strategies on Sonic. ERC‑4626 vaults allocate capital across modular strategies (lending, DEX, staking, derivatives). A Fastify API, an on‑chain indexer (Ponder), and a Next.js frontend power analytics and AI‑assisted rebalancing.

## Sonic Hackathon: S Tier University Edition

This project is built specifically for the Sonic Hackathon: S Tier University Edition as a full, end‑to‑end showcase:
- Smart contracts: ERC‑4626 VeyraVault + six production‑style strategies (Aave/Rings carry, Rings/Aave loop, Eggs/Shadow loop, stS+BEETS, SwapX managed range, Pendle fixed yield on stS)
- Indexer: Ponder with SQL gateway for flows, rebalances, harvests, and vault metrics
- Server: Fastify API with AI‑assisted rebalancing, scheduler, and Supabase persistence
- Frontend: Next.js dashboard with RainbowKit/wagmi on Sonic
- Monetization: Sonic FeeM registration baked into contracts and deploy script

Participant: Janhavi Chavada — B.Tech student, Ajeenkya DY Patil University, Pune

## Highlights
- ERC‑4626 vault with multiple strategies and dynamic allocations
- Components‑based strategy introspection (`components()`) for unified analytics
- Sonic integrations: Aave, Rings, Eggs, Shadow, BEETS, SwapX, Pendle
- Ponder indexer + SQL API for on‑chain flows, rebalances, harvests
- Supabase for AI decision storage (off‑chain only)
- Sonic FeeM support: contracts expose `registerMe(uint256)` for monetization

## Monorepo Overview
- `contracts/`: Solidity sources, Foundry scripts, mocks, tests
- `server/`: Fastify API (TypeScript), scheduler, AI agent
- `ponder/`: Ponder indexer for on-chain events
- `web/`: Next.js 15 app with RainbowKit/wagmi on Sonic
- `supabase/`: SQL migrations and CLI config for hosted/local
- `scripts/`: Repo‑level helpers (deploy, ABI sync)

## Quick Start

Prerequisites
- Node.js 18+
- Foundry (`forge`/`cast`)
- Supabase CLI (optional, for DB/types)

Install
- `cd server && npm install`
- `cd ../ponder && npm install`
- `cd ../web && npm install`
- `cd ../contracts && forge install`

Sync ABIs (after any contract change)
- From repo root: `node scripts/refresh-contracts.mjs`

## Environment

Contracts (`contracts/.env`)
- `SONIC_RPC_URL`: Sonic RPC (http or wss)
- `PRIVATE_KEY`: deployer EOA
- `CHAIN_ID`: chain id (default 146)
- `STRATEGY_MANAGER` (optional): manager EOA (defaults to deployer)
- `FEEM_PROJECT_ID` (optional): Sonic FeeM project id for auto‑registration

Server (`server/.env`) — see `server/.env-example`
- Core: `PORT`, `SONIC_RPC_URL`, `CHAIN_ID`, `MULTICALL3_ADDRESS`
- Vaults: `VAULT_ADDRESSES` (comma‑sep), `DEFAULT_VAULT_ID`
- Admin: `ADMIN_API_KEY` (protects scheduler/rebalance)
- AI (optional): `ANTHROPIC_API_KEY`, `ENABLE_AUTO_REBALANCING`
- Scheduler/agent tuning: `REBALANCE_THRESHOLD_BP`, `REBALANCE_MIN_CONFIDENCE`, `REBALANCE_GAS_LIMIT`, `SCHED_ANALYSIS_CRON`, `SCHED_MONITOR_CRON`
- Database: `DATABASE_URL` (Postgres for Ponder)
- Supabase (off‑chain decisions): `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Deployment: `TUNNEL_TOKEN`, `FEEM_PROJECT_ID`

Ponder (`ponder/.env`)
- Chain: `SONIC_RPC_URL`, `CHAIN_ID`
- Vaults: `VAULT_ADDRESSES` (comma‑sep), `INDEXER_START_BLOCK`
- Database: `DATABASE_URL` (Postgres for Ponder)
- Schema strategy: `INDEXER_DEV_SCHEMA`, `INDEXER_SCHEMA_PREFIX`, `INDEXER_VIEWS_SCHEMA`

Web (`web/.env.local`)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_SONIC_RPC_URL`, `NEXT_PUBLIC_SONIC_WS_URL`

## Contracts

- Build: `cd contracts && forge build`
- Test: `forge test`
- Mock deploy (Foundry): see `contracts/README.md`

Deploy Mock Suite (one command)
- From repo root: `SONIC_RPC_URL=... PRIVATE_KEY=0x... CHAIN_ID=146 node scripts/deploy-mock.mjs`
- Writes latest addresses to `contracts/DEPLOYED_ADDRESSES.md`
- Upserts `VAULT_ADDRESSES`, `DEFAULT_VAULT_ID`, `CHAIN_ID` in `server/.env`
- If `FEEM_PROJECT_ID` set, auto‑calls `registerMe(projectId)` on vaults + strategies
- Syncs ABIs to `server/src/abi` and `web/src/abi`

Sonic FeeM (optional)
- Contracts expose `registerMe(uint256)` and default to Sonic FeeM registry `0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830`
- Set `FEEM_PROJECT_ID` and use the one‑command deploy to register automatically

Tracked tables
- `deposits`, `withdrawals`, `rebalances`, `yield_harvests`, `user_balances`, `vault_metrics`

## API Server

- Dev: `cd server && npm run dev`
- Prod: `npm run build && npm start`

## Ponder Indexer

- Dev: `cd ponder && npm run dev`
- Prod: `npm run start`

Key endpoints
- `GET /api/vaults` — list configured vaults
- `GET /api/vaults/:vaultId/metrics` — live metrics
- `GET /api/vaults/:vaultId/strategy` — latest AI recommendation (from Supabase)
- `GET /api/vaults/:vaultId/ai-rebalance` — detailed recommendation
- `POST /api/vaults/:vaultId/ai-rebalance` — execute rebalance (requires `x-admin-key`)
- `GET /api/vaults/:vaultId/flows|rebalances|harvests` — indexed events (from Ponder database)
- `GET /health` — server/indexer/AI status

## Frontend (web)

- Dev: `cd web && npm run dev` (Next.js 15 + RainbowKit/wagmi)
- Prod: `npm run build && npm start`

Pages
- `/` — overview and hero
- `/vaults` — vault selector + dashboard
- `/analytics` — protocol metrics

## Supabase

- Migrations: `supabase/migrations/*.sql`
- CLI quick start: see `supabase/README.md`
- Generate types (from server/): `npm run db:types` → `src/types/supabase.generated.ts`
- Only off‑chain tables are stored (e.g., `agent_decisions`); on‑chain is from Ponder

## Docker

- Dev stack (API + Indexer): `docker compose -f docker-compose.stack.dev.yml up --build`
- Prod stack (API + Indexer): `docker compose -f docker-compose.stack.prod.yml up -d --build`
- Ensure `server/.env` has: `SONIC_RPC_URL`, `MULTICALL3_ADDRESS`, `VAULT_ADDRESSES`, DB settings

## Troubleshooting

- `Compiling... No files changed, compilation skipped`: cache hit; run `forge clean` to force rebuild
- `History restored`: Foundry broadcast info; new txs still send
- Missing broadcast file: ensure `CHAIN_ID` and path `contracts/broadcast/DeployMockSuite.s.sol/<CHAIN_ID>/run-latest.json`
- Indexer errors: ensure `DATABASE_URL` is set and `npm run indexer:dev`/`prod` is running
- `MULTICALL3_ADDRESS is required`: set correct Multicall3 for Sonic in `server/.env`

## Contributing

- Fork → branch → PR. Keep changes focused and documented.

## License & Disclaimer

- MIT. Experimental software — use at your own risk.

— Built with ❤️ for the Sonic ecosystem
