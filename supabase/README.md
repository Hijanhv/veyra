Supabase project folder

This folder holds your database migrations and local development config if you use the Supabase CLI.

Quick start
- Install CLI: npm i -g supabase
- Login: supabase login
- Link project (optional for hosted): supabase link --project-ref <your-ref>
- Start local stack (optional): supabase start
- Apply migrations locally: supabase db reset
- Push to remote (hosted): supabase db push

Generate TypeScript types (simple)
- Ensure the Supabase CLI is installed and you’re logged in:
  - `npm i -g supabase`
  - `supabase login`
- From `server/`: `npm run db:types`
  - Uses project ref `iyrqtchhttmpyopfvipl` by default (or `SUPABASE_PROJECT_REF` if set)
  - Output: `server/src/types/supabase.generated.ts`
  - Supabase client is already wired to use these types

Migrations
- 0001_init.sql: creates tables for the Veyra indexer:
  - rebalances, strategy_flows, harvests, erc4626_flows, agent_decisions, indexer_state (plus optional vaults/strategies)

Notes
- This folder is the canonical source of truth for database schema. Use the Supabase CLI migrations here.
