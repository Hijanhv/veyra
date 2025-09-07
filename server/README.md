# Veyra Server (Minimal)

Run a Fastify server that reads vaults/strategies and serves analytics.

Quick start
- Install: `npm install`
- Env: `cp .env.example .env` then set `SONIC_RPC_URL` and `MULTICALL3_ADDRESS`

Build/sync contracts
- From repo root: `node scripts/refresh-contracts.mjs` (build + sync ABIs to `server/src/abi` and `web/src/abi`)
- Alternatively from `server/`: `npm run contracts:build` or `npm run abis:sync` (wrappers around the root script)

Notes
- Strategies expose `IStrategyIntrospection.components()` (components-based introspection).
- The server reads the component list and queries each adapter for live metrics (APY/APR, health, etc.).
- Ponder is the source of truth for on-chain events/metrics. Supabase stores only off-chain AI decisions.

Run
- Dev: `npm run dev`
- Prod: `npm run build && npm start`

Admin access (API key)
- Some endpoints are admin-only for safety (manual AI rebalance, scheduler controls).
- Set `ADMIN_API_KEY` in `server/.env` and send it as header `x-admin-key`.
- Protected endpoints:
  - `POST /api/vaults/:vaultId/ai-rebalance`
  - `GET/POST /admin/scheduler/status|start|stop`
- Example (curl):
  - `curl -H "x-admin-key: $ADMIN_API_KEY" -X POST http://localhost:8080/api/vaults/0xYourVault/ai-rebalance`
  - `curl -H "x-admin-key: $ADMIN_API_KEY" http://localhost:8080/admin/scheduler/status`

Endpoints (examples)
- `GET /api/vaults/:vaultId/metrics`
- `GET /api/vaults/:vaultId/strategies/analysis`
- `GET /api/vaults/:vaultId/overview`
- Indexed (via Ponder):
  - `GET /api/vaults/:vaultId/flows?limit=50&offset=0`
  - `GET /api/vaults/:vaultId/rebalances?limit=50&offset=0`
  - `GET /api/vaults/:vaultId/harvests?limit=50&offset=0`

Config notes
- Vaults: keep `VAULT_ADDRESSES` and `DEFAULT_VAULT_ID` in `.env` synced with `contracts/DEPLOYED_ADDRESSES.md`.
- Ponder: set `DATABASE_URL` (Postgres for Ponder). Prefer a separate DB from Supabase to avoid table name collisions.
- Server → Ponder (read): set `PONDER_SQL_URL` (defaults to `http://localhost:42069/sql`).
- Supabase (optional): set `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to persist AI decisions only.

Architecture
- Indexer (Ponder): writes to its own Postgres tables defined in `ponder.schema.ts`.
- API (this server): reads on-chain state directly for metrics and serves AI endpoints. It no longer reads/writes on-chain event tables in Supabase.
- Supabase: retains `agent_decisions` and optional `vaults/strategies` metadata only.

Indexer schema changes (reindex)
- We added a `vault` column to `deposits`, `withdrawals`, `strategy_events`, `rebalances`, and `yield_harvests`.
- To apply: reset your Ponder DB and reindex.
  - If using Postgres, drop/recreate the database or schema; then run `npm run indexer:dev`.
  - Alternatively, point `DATABASE_URL` to a fresh database.
