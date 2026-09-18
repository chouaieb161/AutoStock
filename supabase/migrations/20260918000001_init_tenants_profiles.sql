-- 001_init_tenants_profiles.sql
-- Base multi-tenant : 1 utilisateur = 1 tenant (point de vente).
-- RLS activée sur tenants et profiles ; écriture uniquement via fonctions SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  plan        text not null default 'pro',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.tenants is 'Point de vente (tenant). 1 utilisateur = 1 tenant.';

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'owner' check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Profil applicatif, rattaché à auth.users et à un tenant.';

create index if not exists profiles_tenant_id_idx on public.profiles (tenant_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Tenant de l'utilisateur authentifié.
-- SECURITY DEFINER : lit profiles en contournant la RLS, ce qui évite la
-- récursion des policies qui utiliseraient elles-mêmes profiles.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_tenant_id() to authenticated;

-- Horodatage automatique de updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Onboarding : création du tenant + profil owner pour l'utilisateur courant.
-- Idempotente : renvoie le tenant existant si l'utilisateur en a déjà un.
-- ---------------------------------------------------------------------------
create or replace function public.provision_tenant(
  shop_name text,
  shop_city text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_existing  uuid;
  v_tenant_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  select tenant_id into v_existing from public.profiles where id = v_uid;
  if v_existing is not null then
    return v_existing;
  end if;

  if shop_name is null or length(trim(shop_name)) = 0 then
    raise exception 'SHOP_NAME_REQUIRED' using errcode = '22023';
  end if;

  insert into public.tenants (name, city)
  values (trim(shop_name), nullif(trim(shop_city), ''))
  returning id into v_tenant_id;

  insert into public.profiles (id, tenant_id, role)
  values (v_uid, v_tenant_id, 'owner');

  return v_tenant_id;
end;
$$;

revoke all on function public.provision_tenant(text, text) from public;
grant execute on function public.provision_tenant(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, update on public.tenants to authenticated;
grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;

-- Un tenant ne voit et ne modifie que sa propre fiche.
-- Pas de policy insert/delete : la création passe uniquement par provision_tenant().
drop policy if exists tenants_select_own on public.tenants;
create policy tenants_select_own
  on public.tenants
  for select
  to authenticated
  using (id = public.current_tenant_id());

drop policy if exists tenants_update_own on public.tenants;
create policy tenants_update_own
  on public.tenants
  for update
  to authenticated
  using (id = public.current_tenant_id())
  with check (id = public.current_tenant_id());

-- Un profil n'est visible que par son propriétaire ou les membres de son tenant.
-- Seul le propriétaire peut modifier son profil, et ne peut pas changer de tenant.
drop policy if exists profiles_select_same_tenant on public.profiles;
create policy profiles_select_same_tenant
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or tenant_id = public.current_tenant_id());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and tenant_id = public.current_tenant_id());
