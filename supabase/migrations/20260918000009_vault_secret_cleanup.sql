-- 009_vault_secret_cleanup.sql
-- Suppression des secrets Vault lors de la suppression / du remplacement des
-- identifiants d'un tenant pour un grossiste.
--
-- Constat : la suppression d'une ligne `tenant_suppliers` (déconnexion d'un
-- grossiste, suppression de tenant) laissait l'entrée correspondante dans
-- `vault.secrets` : le mot de passe continuait d'exister en clair en base.
--
-- Correctif : un trigger purge le secret Vault référencé. Il s'exécute en
-- SECURITY DEFINER (propriétaire = postgres, seul rôle ayant les droits sur
-- le schéma `vault`) et ne fait QUE supprimer la ligne Vault pointée par
-- OLD.secret_id.

-- ---------------------------------------------------------------------------
-- 1. Fonction trigger : purge du secret
-- ---------------------------------------------------------------------------
create or replace function public.purge_tenant_supplier_secret()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  -- DELETE : le secret référencé devient inutile.
  -- UPDATE : si secret_id est remplacé (ou remis à null), l'ancien secret
  --          ne doit plus rester en base.
  if tg_op = 'DELETE' and old.secret_id is not null then
    delete from vault.secrets where id = old.secret_id;

  elsif tg_op = 'UPDATE'
        and old.secret_id is not null
        and (new.secret_id is null or new.secret_id is distinct from old.secret_id) then
    delete from vault.secrets where id = old.secret_id;
  end if;

  return coalesce(new, old);
end;
$$;

comment on function public.purge_tenant_supplier_secret() is
  'Supprime le secret Vault référencé par OLD.secret_id lors d''un DELETE ou d''un remplacement de secret_id.';

-- Triggers : AFTER pour que la ligne tenant_suppliers soit déjà cohérente,
-- et Idempotent (drop if exists avant création).
drop trigger if exists tenant_suppliers_purge_secret_delete on public.tenant_suppliers;
create trigger tenant_suppliers_purge_secret_delete
  after delete on public.tenant_suppliers
  for each row execute function public.purge_tenant_supplier_secret();

drop trigger if exists tenant_suppliers_purge_secret_update on public.tenant_suppliers;
create trigger tenant_suppliers_purge_secret_update
  after update of secret_id on public.tenant_suppliers
  for each row execute function public.purge_tenant_supplier_secret();

-- ---------------------------------------------------------------------------
-- 2. Nettoyage des secrets orphelins déjà présents
--    Un secret est considéré orphelin s'il porte la description posée par
--    set_tenant_supplier_secret ET qu'aucune ligne tenant_suppliers ne le
--    référence plus. Le filtre est volontairement strict : aucun secret
--    d'une autre origine n'est touché.
-- ---------------------------------------------------------------------------
do $$
declare
  v_deleted integer;
begin
  with purged as (
    delete from vault.secrets s
    where s.description = 'AutoStock — mot de passe B2B grossiste'
      and not exists (
        select 1 from public.tenant_suppliers ts
        where ts.secret_id = s.id
      )
    returning s.id
  )
  select count(*) into v_deleted from purged;

  raise notice 'Secrets Vault orphelins supprimés : %', v_deleted;
end;
$$;
