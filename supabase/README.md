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
- 0001_init.sql: creates initial schema. As of 0003, Supabase stores only off-chain tables:
  - agent_decisions (plus optional vaults/strategies)
- 0002_ponder_rls.sql: enables public read policies (no custom roles created)
- 0003_drop_analytics_tables.sql: drops on-chain analytics tables in Supabase; Ponder is the source of truth for events/metrics

Notes
- This folder is the canonical source of truth for database schema. Use the Supabase CLI migrations here.
