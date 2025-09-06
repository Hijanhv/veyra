-- Initial schema for Veyra indexer and AI decisions

create table if not exists vaults (
  vault_address text primary key,
  asset_address text,
  decimals int,
  name text,
  created_at timestamptz default now()
);

create table if not exists strategies (
  strategy_address text primary key,
  vault_address text references vaults(vault_address) on delete cascade,
  type text,
  metadata jsonb,
  created_at timestamptz default now()
);

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

create table if not exists rebalances (
  chain_id bigint not null,
  tx_hash text not null,
  log_index int not null,
  block_number bigint not null,
  ts timestamptz not null,
  vault_address text not null,
  before_alloc_json jsonb,
  after_alloc_json jsonb not null,
  primary key(chain_id, tx_hash, log_index)
);
create index if not exists idx_rebalances_vault_ts on rebalances(vault_address, ts desc);

create table if not exists strategy_flows (
  chain_id bigint not null,
  tx_hash text not null,
  log_index int not null,
  block_number bigint not null,
  ts timestamptz not null,
  vault_address text not null,
  strategy_address text not null,
  action text not null check (action in ('deploy','withdraw','harvest')),
  asset_address text,
  amount_wei numeric,
  primary key(chain_id, tx_hash, log_index)
);
create index if not exists idx_strategy_flows_vault_ts on strategy_flows(vault_address, ts desc);
create index if not exists idx_strategy_flows_strategy_ts on strategy_flows(strategy_address, ts desc);

create table if not exists harvests (
  chain_id bigint not null,
  tx_hash text not null,
  log_index int not null,
  block_number bigint not null,
  ts timestamptz not null,
  vault_address text not null,
  total_yield_wei numeric not null,
  primary key(chain_id, tx_hash, log_index)
);
create index if not exists idx_harvests_vault_ts on harvests(vault_address, ts desc);

create table if not exists erc4626_flows (
  chain_id bigint not null,
  tx_hash text not null,
  log_index int not null,
  block_number bigint not null,
  ts timestamptz not null,
  vault_address text not null,
  caller text,
  owner text,
  receiver text,
  action text not null check (action in ('deposit','withdraw')),
  assets_wei numeric not null,
  shares_wei numeric not null,
  primary key(chain_id, tx_hash, log_index)
);
create index if not exists idx_erc4626_flows_vault_ts on erc4626_flows(vault_address, ts desc);

create table if not exists indexer_state (
  chain_id bigint primary key,
  cursor_block bigint not null,
  updated_at timestamptz default now()
);

