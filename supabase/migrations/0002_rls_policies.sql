-- Enable Row Level Security and public read access for off-chain tables
-- Service role key bypasses RLS automatically for server writes

-- Enable RLS on analytics tables
alter table if exists public.vaults enable row level security;
alter table if exists public.strategies enable row level security;
alter table if exists public.agent_decisions enable row level security;

-- Allow public reads (anon + authenticated users)
-- Drop-then-create pattern avoids unsupported IF NOT EXISTS on CREATE POLICY
drop policy if exists vaults_read_public on public.vaults;
create policy vaults_read_public on public.vaults
  for select to anon, authenticated using (true);

drop policy if exists strategies_read_public on public.strategies;
create policy strategies_read_public on public.strategies
  for select to anon, authenticated using (true);

drop policy if exists agent_decisions_read_public on public.agent_decisions;
create policy agent_decisions_read_public on public.agent_decisions
  for select to anon, authenticated using (true);
