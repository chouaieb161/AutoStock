-- 008_sopra_and_vault_helpers.sql
-- Étape 2 : branchement du connecteur SOPRA + accès Vault encadré.
--
-- Contenu :
--   1. Ajout du grossiste SOPRA au référentiel (idempotent).
--   2. Wrappers SECURITY DEFINER pour lire/écrire le mot de passe B2B dans
--      Supabase Vault. Le schéma `vault` n'étant pas exposé par PostgREST,
--      ces fonctions `public.*` sont le seul point d'entrée, et elles ne sont
--      exécutables QUE par le rôle `service_role` (jamais anon/authenticated).
--      Les secrets ne sont donc jamais lisibles depuis le client.

-- ---------------------------------------------------------------------------
-- 1. Référentiel fournisseurs : SOPRA
-- ---------------------------------------------------------------------------
insert into public.suppliers (code, name, city, base_url, supports_api)
values ('SOP', 'SOPRA', 'Sfax', 'https://soprab2b.tn', false)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Vault : écriture/mise à jour du secret d'un tenant_supplier
--    - crée le secret s'il n'existe pas, sinon le met à jour ;
--    - met à jour tenant_suppliers.secret_id ;
--    - renvoie l'id du secret.
-- ---------------------------------------------------------------------------
create or replace function public.set_tenant_supplier_secret(
  p_tenant_supplier_id uuid,
  p_secret             text,
  p_name               text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_existing uuid;
  v_id       uuid;
begin
  if p_secret is null or length(p_secret) = 0 then
    raise exception 'EMPTY_SECRET' using errcode = '22023';
  end if;

  select secret_id into v_existing
  from public.tenant_suppliers
  where id = p_tenant_supplier_id;

  if not found then
    raise exception 'TENANT_SUPPLIER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_existing is null then
    v_id := vault.create_secret(
      p_secret,
      coalesce(p_name, 'tenant_supplier_' || p_tenant_supplier_id::text),
      'AutoStock — mot de passe B2B grossiste'
    );
    update public.tenant_suppliers
      set secret_id = v_id
      where id = p_tenant_supplier_id;
  else
    perform vault.update_secret(
      v_existing,
      p_secret,
      coalesce(p_name, 'tenant_supplier_' || p_tenant_supplier_id::text),
      'AutoStock — mot de passe B2B grossiste'
    );
    v_id := v_existing;
  end if;

  return v_id;
end;
$$;

revoke all on function public.set_tenant_supplier_secret(uuid, text, text) from public;
revoke all on function public.set_tenant_supplier_secret(uuid, text, text) from anon, authenticated;
grant execute on function public.set_tenant_supplier_secret(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Vault : lecture déchiffrée d'un secret (service_role uniquement).
--    N'est appelée que côté Edge Function au moment d'exécuter un connecteur.
-- ---------------------------------------------------------------------------
create or replace function public.get_tenant_supplier_secret(
  p_secret_id uuid
)
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_secret_id;
$$;

revoke all on function public.get_tenant_supplier_secret(uuid) from public;
revoke all on function public.get_tenant_supplier_secret(uuid) from anon, authenticated;
grant execute on function public.get_tenant_supplier_secret(uuid) to service_role;
