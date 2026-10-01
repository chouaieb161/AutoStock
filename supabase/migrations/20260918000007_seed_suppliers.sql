-- 007_seed_suppliers.sql
-- Ré-applique le référentiel de grossistes B2B. La migration 002 contient déjà
-- ce seed avec `on conflict do nothing`, mais la base cloud était vide (le
-- INSERT n'avait pas été committé). Ce fichier est idempotent : relancer cette
-- migration ne dupliquera aucune ligne.

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