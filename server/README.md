# Veyra Server

Run a Fastify server that reads vaults/strategies and serves analytics.

Quick start
- Install: `npm install`
- Env: `cp .env-example .env` then set `SONIC_RPC_URL`, `MULTICALL3_ADDRESS` and other environment variables.

Build/sync contracts
- From repo root: `node scripts/refresh-contracts.mjs` (build + sync ABIs to `server/src/abi` and `web/src/abi`)
- Alternatively from `server/`: `npm run abis:sync` (wrappers around the root script)

Notes
- Strategies expose `IStrategyIntrospection.components()` (components-based introspection).
- The server reads the component list and queries each adapter for live metrics (APY/APR, health, etc.).
- Ponder indexer (separate package) is the source of truth for on-chain events/metrics. Supabase stores only off-chain AI decisions.

Run
- Dev (server): `npm run dev`
- Prod (server): `npm run build && npm start`

Ponder Indexer (separate package)
- Install: `cd ../ponder && npm install`
- Dev: `cd ../ponder && npm run dev`
- Prod: `cd ../ponder && npm run start`

Admin access (API key)
- Some endpoints are admin-only for safety (execute rebalancing, scheduler controls).
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
  - Decisions are read from Supabase `agent_decisions` table (latest per vault)

Config notes
- Vaults: keep `VAULT_ADDRESSES` and `DEFAULT_VAULT_ID` in `.env` synced with `contracts/DEPLOYED_ADDRESSES.md`.
- Supabase (optional): set `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to persist AI decisions only.

Agent tuning (env)
- `AGENT_MODEL`: AI model id (defaults to `claude-sonnet-4-20250514`).
- `REBALANCE_THRESHOLD_BP`: delta in bps to trigger rebalance (default 500).
- `REBALANCE_MIN_CONFIDENCE`: minimum confidence to execute on-chain (default 0.7).
- `REBALANCE_GAS_LIMIT`: gas limit for on-chain rebalance (default 500000).
- `SCHED_ANALYSIS_CRON` / `SCHED_MONITOR_CRON`: cron schedules (UTC).
- Guidelines for prompt only (do not affect execution): `AGENT_MAX_LEVERAGE_BP`, `AGENT_MAX_COMPLEX_BP`, `AGENT_MIN_HEALTH_FACTOR`.

Architecture
- Ponder Indexer (separate package): writes to Postgres tables, configured in `../ponder/` directory.
  - Dev: runs against stable schema `INDEXER_DEV_SCHEMA` (default `veyra_dev`).
  - Prod: runs against a unique schema per deploy (e.g. `veyra_20240908_120301`) and publishes read-only views to a stable `INDEXER_VIEWS_SCHEMA` (default `veyra`).
- Supabase: retains `agent_decisions` and optional metadata only.

Views schema pattern
- We start Ponder with `--schema <unique>` and `--views-schema <stable>`.
- Downstream readers can query the stable views schema, e.g. `SELECT * FROM veyra.deposits;` and always hit the latest deployment.
  - Dev uses `INDEXER_DEV_SCHEMA` directly and typically doesn't publish views.

Docker
- Dev (server only): hot reload
  - `docker compose -f docker-compose.dev.yml up --build`
  - Uses `server/.env`. Ensure `SONIC_RPC_URL`, `MULTICALL3_ADDRESS`, `VAULT_ADDRESSES` are set.
  - API at `http://localhost:8080`.
- Prod (server only): compiled
  - `docker compose -f docker-compose.prod.yml up -d --build`
  - Uses `server/.env` for all config, including Supabase and any external services.

- Dev stack (API + Indexer):
  - From repo root: `docker compose -f docker-compose.stack.dev.yml up --build`
  - Runs Ponder in its own container and the API in another; no Postgres is bundled.

- Prod stack (API + Indexer):
  - From repo root: `docker compose -f docker-compose.stack.prod.yml up -d --build`
  - Indexer runs with unique schema + views (via ponder/scripts/run-ponder.mjs). API connects to database via `DATABASE_URL`.

Notes
- Server and Indexer run as separate containers; starting the indexer does not start the server.

