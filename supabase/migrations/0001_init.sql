-- Initial Veyra Protocol Analytics Schema
-- Only includes off-chain analytics tables for AI decisions and metadata
-- Ponder handles onchain event indexing in separate schema

-- Vault metadata (optional, for analytics UI)
create table if not exists vaults (
  vault_address text primary key,
  asset_address text,
  decimals int,
  name text,
  created_at timestamptz default now()
);

-- Strategy metadata (optional, for analytics UI)
create table if not exists strategies (
  strategy_address text primary key,
  vault_address text references vaults(vault_address) on delete cascade,
  type text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- AI agent decisions (off-chain analytics)
create table if not exists agent_decisions (
  id bigserial primary key,
  chain_id bigint not null,
  vault_address text not null,
  allocations_json jsonb not null,
  expected_apy_bp bigint not null,
  risk_score numeric not null,
  confidence numeric not null,
  reasoning text,
  market_context text,
  created_at timestamptz default now()
);
create index if not exists idx_agent_decisions_vault_ts on agent_decisions(vault_address, created_at desc);