-- Ponder writer role (optional). If BYPASSRLS is not permitted in your Supabase project,
-- connect as the 'postgres' user instead for indexing.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'indexer_writer') then
    create role indexer_writer login password 'REPLACE_WITH_STRONG_PASSWORD';
    -- Requires superuser; may not be allowed in hosted envs. Use postgres if this fails.
    begin
      alter role indexer_writer bypassrls;
    exception when insufficient_privilege then
      raise notice 'Could not set BYPASSRLS on indexer_writer; use postgres or grant appropriate privileges';
    end;
    grant usage on schema public to indexer_writer;
    grant insert, update, select on all tables in schema public to indexer_writer;
    alter default privileges in schema public grant insert, update, select on tables to indexer_writer;
  end if;
end $$;

-- Enable RLS and allow public reads (anon + authenticated) for vault analytics tables
alter table if exists public.rebalances enable row level security;
alter table if exists public.strategy_flows enable row level security;
alter table if exists public.harvests enable row level security;
alter table if exists public.erc4626_flows enable row level security;
alter table if exists public.agent_decisions enable row level security;

-- Create policies if not present
create policy if not exists rebalances_read_public
  on public.rebalances for select to anon, authenticated using (true);

create policy if not exists strategy_flows_read_public
  on public.strategy_flows for select to anon, authenticated using (true);

create policy if not exists harvests_read_public
  on public.harvests for select to anon, authenticated using (true);

create policy if not exists erc4626_flows_read_public
  on public.erc4626_flows for select to anon, authenticated using (true);

create policy if not exists agent_decisions_read_public
  on public.agent_decisions for select to anon, authenticated using (true);

