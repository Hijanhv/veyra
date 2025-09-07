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
  - Scheduler runs by default on startup (hourly). You can disable/enable via the above endpoints. The state persists in a local SQLite cache at `server/data/cache.sqlite`.
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
  - Admin: `POST /api/vaults/:vaultId/agent/generate` (forces a fresh AI recommendation + persists to cache)

Config notes
- Vaults: keep `VAULT_ADDRESSES` and `DEFAULT_VAULT_ID` in `.env` synced with `contracts/DEPLOYED_ADDRESSES.md`.
- Ponder: set `DATABASE_URL` (Postgres for Ponder). Prefer a separate DB from Supabase to avoid table name collisions. If using the same Postgres, use a dedicated schema (we default to `veyra_indexer`).
- Server → Ponder (read): set `PONDER_SQL_URL` (defaults to `http://localhost:42069/sql`).
- Supabase (optional): set `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to persist AI decisions only.

Agent tuning (env)
- `AGENT_MODEL`: AI model id (defaults to `claude-sonnet-4-20250514`).
- `REBALANCE_THRESHOLD_BP`: delta in bps to trigger rebalance (default 500).
- `REBALANCE_MIN_CONFIDENCE`: minimum confidence to execute on-chain (default 0.7).
- `REBALANCE_GAS_LIMIT`: gas limit for on-chain rebalance (default 500000).
- `SCHED_ANALYSIS_CRON` / `SCHED_MONITOR_CRON`: cron schedules (UTC).
- Guidelines for prompt only (do not affect execution): `AGENT_MAX_LEVERAGE_BP`, `AGENT_MAX_COMPLEX_BP`, `AGENT_MIN_HEALTH_FACTOR`.

Architecture
- Indexer (Ponder): writes to its own Postgres tables defined in `ponder.schema.ts`. Start with `npm run indexer:start` which uses schema `veyra_indexer`. If you previously ran against `public`, drop only the Ponder tables or switch schema.
- API (this server): reads on-chain state directly for metrics and serves AI endpoints. It no longer reads/writes on-chain event tables in Supabase.
- Supabase: retains `agent_decisions` and optional `vaults/strategies` metadata only.
  A local SQLite cache is used for serving API responses to avoid making real-time AI calls on each request. The scheduler populates this cache.

Indexer schema changes (reindex)
- We added a `vault` column to `deposits`, `withdrawals`, `strategy_events`, `rebalances`, and `yield_harvests`.
- To apply: reset your Ponder DB and reindex.
  - If using Postgres, drop/recreate the database or schema; then run `npm run indexer:dev`.
  - Alternatively, point `DATABASE_URL` to a fresh database.
