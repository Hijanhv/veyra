# Veyra Server (Minimal)

Run a Fastify server that reads vaults/strategies and serves analytics.

Quick start
- Install: `npm install`
- Env: `cp .env.example .env` then set `SONIC_RPC_URL`, `MULTICALL3_ADDRESS`, `DATABASE_URL`

Build/sync contracts
- From repo root: `node scripts/refresh-contracts.mjs` (build + sync ABIs to `server/src/abi` and `web/src/abi`)
- Alternatively from `server/`: `npm run contracts:build` or `npm run abis:sync` (wrappers around the root script)

Notes
- Strategies expose `IStrategyIntrospection.components()` (components-based introspection).
- The server reads the component list and queries each adapter for live metrics (APY/APR, health, etc.).
- Ponder is the source of truth for on-chain events/metrics. Supabase stores only off-chain AI decisions.

Run
- Dev (server): `npm run dev`
- Prod (server): `npm run build && npm start`
- Indexer (dev): `npm run indexer:dev` (uses stable schema `INDEXER_DEV_SCHEMA`)
- Indexer (prod): `npm run indexer:prod` (generates unique schema + publishes views)

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
- Ponder: set `DATABASE_URL` (Postgres for Ponder).
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
- Indexer (Ponder): writes to Postgres tables defined in `ponder.schema.ts`.
  - Dev: runs against stable schema `INDEXER_DEV_SCHEMA` (default `veyra_dev`).
  - Prod: runs against a unique schema per deploy (e.g. `veyra_20240908_120301`) and publishes read-only views to a stable `INDEXER_VIEWS_SCHEMA` (default `veyra`).
- API (this server): reads on-chain state for live metrics and queries Ponder via HTTP SQL (`PONDER_SQL_URL`).
- Supabase: retains `agent_decisions` and optional metadata only.

Views schema pattern
- We start Ponder with `--schema <unique>` and `--views-schema <stable>`.
- Downstream readers can query the stable views schema, e.g. `SELECT * FROM veyra.deposits;` and always hit the latest deployment.
  - Dev uses `INDEXER_DEV_SCHEMA` directly and typically doesn't publish views.

Env variables (indexer)
- `DATABASE_URL`: Postgres for Ponder (writer)
- `INDEXER_DEV_SCHEMA`: stable dev schema (default `veyra_dev`)
- `INDEXER_SCHEMA_PREFIX`: prefix for unique prod schemas (default `veyra`)
- `INDEXER_VIEWS_SCHEMA`: stable views schema (default `veyra`)

Docker
- Dev (server only): hot reload
  - `docker compose -f docker-compose.dev.yml up --build`
  - Uses `server/.env`. Ensure `SONIC_RPC_URL`, `MULTICALL3_ADDRESS`, `VAULT_ADDRESSES` are set.
  - API at `http://localhost:8080`.
- Prod (server only): compiled
  - `docker compose -f docker-compose.prod.yml up -d --build`
  - Uses `server/.env` for all config, including Supabase and any external services.

- Dev stack (API + Indexer):
  - `docker compose -f docker-compose.stack.dev.yml up --build`
  - Runs Ponder in its own container and the API in another; no Postgres is bundled. Set `DATABASE_URL` in `server/.env` to your Supabase.
  - API at `http://localhost:8080`, Ponder SQL at `http://localhost:42069/sql`.

- Prod stack (API + Indexer):
  - `docker compose -f docker-compose.stack.prod.yml up -d --build`
  - Indexer runs with unique schema + views (via scripts/run-ponder.mjs). API points to it via `PONDER_SQL_URL`.
  - API at `http://localhost:8080`, Ponder SQL at `http://localhost:42069/sql`.

Notes
- Server and Indexer run as separate containers; starting the indexer does not start the server.
- No Postgres is bundled. Set `DATABASE_URL` in `server/.env` to your Supabase connection.
