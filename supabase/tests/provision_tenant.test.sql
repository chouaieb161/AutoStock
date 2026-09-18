-- Tests pgTAP de l'onboarding : provision_tenant() et current_tenant_id().
-- Exécution : `supabase test db`.

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000',
   '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'owner-c@test.tn', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);

select is(
  public.current_tenant_id(),
  null::uuid,
  'aucun tenant avant la première provisioning'
);

select lives_ok(
  $$ select public.provision_tenant('Ma Boutique', 'Tunis') $$,
  'provision_tenant crée le tenant et le profil owner'
);

select isnt(
  public.current_tenant_id(),
  null::uuid,
  'current_tenant_id() renvoie le tenant après provisioning'
);

select is(
  (select count(*) from public.tenants),
  1::bigint,
  'le propriétaire ne voit que son propre tenant'
);

select is(
  public.provision_tenant('Autre Nom', 'Sfax'),
  public.current_tenant_id(),
  'provision_tenant est idempotente et renvoie le tenant existant'
);

select is(
  (select count(*) from public.tenants),
  1::bigint,
  'aucun tenant en double n''a été créé'
);

select * from finish();

rollback;
