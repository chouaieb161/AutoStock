-- 002_suppliers.sql
-- Référentiel global des grossistes B2B (non lié à un tenant).
-- Lecture ouverte à tout utilisateur authentifié ; écriture réservée au service role.

create table if not exists public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  city          text,
  base_url      text,
  is_active     boolean not null default true,
  supports_api  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.suppliers is 'Référentiel global des fournisseurs B2B (catalogue).';

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

grant select on public.suppliers to authenticated;

alter table public.suppliers enable row level security;

-- Catalogue global : lisible par tout utilisateur authentifié, aucune donnée tenant.
-- Pas de policy insert/update/delete => écriture impossible côté client.
drop policy if exists suppliers_select_authenticated on public.suppliers;
create policy suppliers_select_authenticated
  on public.suppliers
  for select
  to authenticated
  using (true);

-- Données de référence (idempotent).
insert into public.suppliers (code, name, city, base_url, supports_api) values
  ('ST',    'SOTACAP',                    'Ben Arous',            'https://sotacap.com', true),
  ('GP',    'Gamaparts',                  'Ariana',               null,                  false),
  ('AD',    'Autodistribution',           'Charguia II',          null,                  true),
  ('CP',    'Comptoir Pièces Sfax',       'Route de Gabès, Sfax', null,                  false),
  ('MA',    'Maghreb Auto Pièces',        'Mégrine',              null,                  false),
  ('TPM',   'Tunisie Pièces Mécanique',   'Sousse',               null,                  false),
  ('SIVAM', 'SIVAM',                      'Tunis',                null,                  false),
  ('SOTUFAR','SOTUFAR',                   'Ezzahra',              null,                  false),
  ('AUTOPRO','AutoPro',                   'Sousse',               null,                  false),
  ('UPA',   'Universal Pièces Auto',      'Nabeul',               null,                  false),
  ('BADER', 'Bader Pièces Détachées',     'Bizerte',              null,                  false)
on conflict (code) do nothing;
