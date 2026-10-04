-- 013_lahianipa_supplier.sql
-- Référentiel : enregistre le grossiste LAHIANI (lahianipa.com) pour activer
-- son connecteur. La colonne base_url est LITTÉRALEMENT l'URL publique du
-- domaine (ouverte par le bouton « Commander ») ; l'application B2B du
-- connecteur vit sur /LahianiB2B et reste codée dans le connecteur.
-- Idempotent ; ne touche ni RLS ni Vault. Aucune donnée tenant concernée.

insert into public.suppliers (code, name, city, base_url, supports_api)
values ('LHI', 'Lahiani Pièces Auto', null, 'https://lahianipa.com', true)
on conflict (code) do update
  set base_url = excluded.base_url,
      supports_api = excluded.supports_api;
