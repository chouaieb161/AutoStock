-- 003_tenant_suppliers.sql
-- Identifiants B2B d'un tenant pour un grossiste donné.
-- Le mot de passe n'est JAMAIS stocké en clair : il est placé dans Supabase Vault
-- et seule la référence (secret_id) est conservée ici.
-- L'écriture du secret se fait exclusivement via Edge Function (service role).

create extension if not exists supabase_vault;

create table if not exists public.tenant_suppliers (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  supplier_id   uuid not null references public.suppliers(id) on delete cascade,
  identifier    text not null,
  -- Référence vers vault.secrets(id). Pas de FK : le schéma vault n'est pas
  -- exposé à l'API et le secret reste inaccessible aux rôles anon/authenticated.
  secret_id     uuid,
  status        text not null default 'connected'
                check (status in ('connected', 'blocked', 'error')),
  last_check_at timestamptz,
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, supplier_id)
);

comment on table public.tenant_suppliers is 'Compte B2B d''un tenant chez un grossiste (secret dans Vault).';

create index if not exists tenant_suppliers_tenant_id_idx
  on public.tenant_suppliers (tenant_id);

drop trigger if exists tenant_suppliers_set_updated_at on public.tenant_suppliers;
create trigger tenant_suppliers_set_updated_at
  before update on public.tenant_suppliers
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.tenant_suppliers to authenticated;

alter table public.tenant_suppliers enable row level security;

-- Chaque policy isole strictement sur tenant_id = current_tenant_id().
-- Un tenant ne peut donc jamais lire/lier les identifiants d'un autre,
-- même avec un identifiant de ligne ou un tenant_id forgé.
drop policy if exists tenant_suppliers_select_own on public.tenant_suppliers;
create policy tenant_suppliers_select_own
  on public.tenant_suppliers
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists tenant_suppliers_insert_own on public.tenant_suppliers;
create policy tenant_suppliers_insert_own
  on public.tenant_suppliers
  for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

drop policy if exists tenant_suppliers_update_own on public.tenant_suppliers;
create policy tenant_suppliers_update_own
  on public.tenant_suppliers
  for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists tenant_suppliers_delete_own on public.tenant_suppliers;
create policy tenant_suppliers_delete_own
  on public.tenant_suppliers
  for delete
  to authenticated
  using (tenant_id = public.current_tenant_id());
