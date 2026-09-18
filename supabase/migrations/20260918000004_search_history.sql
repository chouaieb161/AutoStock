-- 004_search_history.sql
-- Historique des recherches d'un tenant (journal immuable).

create table if not exists public.search_history (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  reference       text not null,
  marque          text,
  results_count   integer not null default 0 check (results_count >= 0),
  suppliers_ok    integer not null default 0 check (suppliers_ok >= 0),
  suppliers_error integer not null default 0 check (suppliers_error >= 0),
  created_at      timestamptz not null default now()
);

comment on table public.search_history is 'Historique des recherches (par tenant), alimenté côté serveur.';

create index if not exists search_history_tenant_created_idx
  on public.search_history (tenant_id, created_at desc);

grant select, insert, delete on public.search_history to authenticated;

alter table public.search_history enable row level security;

drop policy if exists search_history_select_own on public.search_history;
create policy search_history_select_own
  on public.search_history
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists search_history_insert_own on public.search_history;
create policy search_history_insert_own
  on public.search_history
  for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

-- Journal immuable : pas de policy update. Suppression autorisée pour purge par le tenant.
drop policy if exists search_history_delete_own on public.search_history;
create policy search_history_delete_own
  on public.search_history
  for delete
  to authenticated
  using (tenant_id = public.current_tenant_id());
