-- 006_provision_from_metadata.sql
-- Plan B d'onboarding : si l'e-mail de confirmation est requis, le tenant ne
-- peut pas être créé au moment du signUp. À la première connexion, on le crée
-- à partir des métadonnées renseignées à l'inscription (shop_name, shop_city).
-- SECURITY DEFINER : lit auth.users en contournant la RLS (aucune donnée ne
-- sort : seule la création du tenant/profil du CURRENT user est autorisée).

create or replace function public.provision_tenant_from_metadata()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_meta      jsonb;
  v_existing  uuid;
  v_shop      text;
  v_city      text;
  v_tenant_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  -- Idempotent : on ne reprovisionne jamais un tenant existant.
  select tenant_id into v_existing from public.profiles where id = v_uid;
  if v_existing is not null then
    return v_existing;
  end if;

  select raw_user_meta_data into v_meta from auth.users where id = v_uid;
  v_shop := nullif(trim(coalesce(v_meta->>'shop_name', '')), '');
  if v_shop is null then
    return null;
  end if;
  v_city := nullif(trim(coalesce(v_meta->>'shop_city', '')), '');

  insert into public.tenants (name, city)
  values (v_shop, v_city)
  returning id into v_tenant_id;

  insert into public.profiles (id, tenant_id, role)
  values (v_uid, v_tenant_id, 'owner');

  return v_tenant_id;
end;
$$;

revoke all on function public.provision_tenant_from_metadata() from public;
grant execute on function public.provision_tenant_from_metadata() to authenticated;