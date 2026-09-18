-- Tests pgTAP d'isolation multi-tenant (RLS).
-- Exécution : `supabase test db` (nécessite la stack locale via `supabase start`).
--
-- Objectif : garantir qu'un tenant ne peut jamais lire ni modifier les données
-- d'un autre tenant, même en connaissant un identifiant de ligne ou en forgeant
-- un tenant_id.

begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- --- Fixtures (insérées en tant qu'owner, RLS contournée) -------------------
-- profiles.id référence auth.users : on crée d'abord les deux utilisateurs.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'owner-a@test.tn', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'owner-b@test.tn', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false);

insert into public.tenants (id, name, city) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'Tunis'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'Sfax');

insert into public.profiles (id, tenant_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner');

-- ---------------------------------------------------------------------------
-- Tenant A : ajoute un article au panier de suivi
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);

select lives_ok(
  $$ insert into public.tracking_cart_items (tenant_id, supplier_id, reference, designation)
     select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, '410602192R', 'Plaquettes frein'
     from public.suppliers where code = 'GP' $$,
  'A peut ajouter un article dans son propre panier'
);

select is(
  (select count(*) from public.tracking_cart_items),
  1::bigint,
  'A ne voit que ses propres articles'
);
reset role;

-- ---------------------------------------------------------------------------
-- Tenant B : ne voit rien de A et ne peut pas le modifier
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.tracking_cart_items),
  0::bigint,
  'B ne voit aucun article de A'
);

select is(
  (select count(*) from public.tenants where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'B ne peut pas lire le tenant A'
);

select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'B ne peut pas lire le profil de A'
);

select lives_ok(
  $$ update public.tracking_cart_items set quantite = 99 $$,
  'B : update silencieux sans erreur (RLS)'
);
reset role;

select is(
  (select quantite from public.tracking_cart_items limit 1),
  1,
  'B n''a pas pu modifier la quantité de l''article de A'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);

select throws_ok(
  $$ insert into public.tracking_cart_items (tenant_id, supplier_id, reference)
     select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, 'TRICHE'
     from public.suppliers where code = 'GP' $$,
  '42501',
  null,
  'B ne peut pas insérer un article au nom de A (RLS)'
);

select * from finish();

rollback;
