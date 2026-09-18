-- 005_tracking_cart_items.sql
-- « Panier de suivi » : articles mis dans les paniers des sites fournisseurs.
-- Ajout automatique quand l'utilisateur clique sur « Commander » dans /resultats.

create table if not exists public.tracking_cart_items (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  supplier_id   uuid not null references public.suppliers(id) on delete restrict,
  reference     text not null,
  designation   text,
  marque        text,
  prix_millimes integer check (prix_millimes is null or prix_millimes >= 0),
  devise        text not null default 'TND',
  quantite      integer not null default 1 check (quantite > 0),
  product_url   text,
  status        text not null default 'pending'
                check (status in ('pending', 'ordered', 'received')),
  added_by      uuid references auth.users(id) on delete set null,
  added_at      timestamptz not null default now(),
  ordered_at    timestamptz
);

comment on table public.tracking_cart_items is 'Panier de suivi interne (par tenant), groupé par fournisseur.';

create index if not exists tracking_cart_items_tenant_status_idx
  on public.tracking_cart_items (tenant_id, status);
create index if not exists tracking_cart_items_tenant_supplier_idx
  on public.tracking_cart_items (tenant_id, supplier_id);

grant select, insert, update, delete on public.tracking_cart_items to authenticated;

alter table public.tracking_cart_items enable row level security;

drop policy if exists tracking_cart_items_select_own on public.tracking_cart_items;
create policy tracking_cart_items_select_own
  on public.tracking_cart_items
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists tracking_cart_items_insert_own on public.tracking_cart_items;
create policy tracking_cart_items_insert_own
  on public.tracking_cart_items
  for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id());

drop policy if exists tracking_cart_items_update_own on public.tracking_cart_items;
create policy tracking_cart_items_update_own
  on public.tracking_cart_items
  for update
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists tracking_cart_items_delete_own on public.tracking_cart_items;
create policy tracking_cart_items_delete_own
  on public.tracking_cart_items
  for delete
  to authenticated
  using (tenant_id = public.current_tenant_id());
