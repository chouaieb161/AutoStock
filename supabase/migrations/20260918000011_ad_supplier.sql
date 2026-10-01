-- 011_ad_supplier.sql
-- Renseigne l'URL du grossiste AD « Autodistribution » (référentiel seed 007)
-- pour activer le connecteur pro.ad-tunisie.com. Idempotent ; ne touche ni
-- RLS ni Vault. Aucune donnée tenant concernée.

insert into public.suppliers (code, name, city, base_url, supports_api)
values ('AD', 'Autodistribution', 'Charguia II', 'https://pro.ad-tunisie.com', true)
on conflict (code) do update
  set base_url = excluded.base_url,
      supports_api = excluded.supports_api;

-- Sécurité : la colonne base_url reste LITERALEMENT l'URL publique du site —
-- aucune information sensible n'y est exposée. Aucune politique RLS modifiée.