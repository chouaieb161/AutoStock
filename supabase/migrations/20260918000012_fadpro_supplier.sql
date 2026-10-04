-- 012_fadpro_supplier.sql
-- Référentiel : enregistre le grossiste FADPRO (fadpro.tn) pour activer son
-- connecteur. La colonne base_url est LITTÉRALEMENT l'URL publique du site
-- (ouverte par le bouton « Commander ») ; l'API métier du connecteur vit sur
-- un autre hôte/port et reste codée dans le connecteur. Idempotent ; ne touche
-- ni RLS ni Vault. Aucune donnée tenant concernée.

insert into public.suppliers (code, name, city, base_url, supports_api)
values ('FAD', 'FADPRO', null, 'https://fadpro.tn', true)
on conflict (code) do update
  set base_url = excluded.base_url,
      supports_api = excluded.supports_api;
