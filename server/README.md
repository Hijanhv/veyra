# Veyra Server (Minimal)

Run a Fastify server that reads vaults/strategies and serves analytics.

Quick start
- Install: `npm install`
- Env: `cp .env.example .env` then set `SONIC_RPC_URL` and `MULTICALL3_ADDRESS`

Build/sync contracts
- Build + sync ABIs: `npm run contracts:build`
- Sync ABIs (no build): `npm run abis:sync`

Notes
- Strategies expose `IStrategyIntrospection.components()` (components-based introspection).
- The server reads the component list and queries each adapter for live metrics (APY/APR, health, etc.).
- Ponder is the source of truth for on-chain events/metrics. Supabase stores only off-chain AI decisions.

Run
- Dev: `npm run dev`
- Prod: `npm run build && npm start`

Endpoints (examples)
- `GET /api/vaults/:vaultId/metrics`
- `GET /api/vaults/:vaultId/strategies/analysis`

Config notes
- Vaults: keep `VAULT_ADDRESSES` and `DEFAULT_VAULT_ID` in `.env` synced with `contracts/DEPLOYED_ADDRESSES.md`.
- Ponder: set `DATABASE_URL` (Postgres for Ponder). Prefer a separate DB from Supabase to avoid table name collisions.
- Supabase (optional): set `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to persist AI decisions only.

Architecture
- Indexer (Ponder): writes to its own Postgres tables defined in `ponder.schema.ts`.
- API (this server): reads on-chain state directly for metrics and serves AI endpoints. It no longer reads/writes on-chain event tables in Supabase.
- Supabase: retains `agent_decisions` and optional `vaults/strategies` metadata only.
