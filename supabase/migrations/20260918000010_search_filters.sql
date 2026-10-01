-- 010_search_filters.sql
-- Critères de recherche étendus : désignation « contient » + mode de
-- référence (« exact » ou « commence par »).
--
-- RLS inchangée : aucune policy modifiée ; ces colonnes suivent les
-- policies existantes de search_history (lecture/insertion par tenant).

alter table public.search_history
  add column if not exists designation   text,
  add column if not exists reference_mode text not null default 'exact';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.search_history'::regclass
      and conname = 'search_history_reference_mode_check'
  ) then
    alter table public.search_history
      add constraint search_history_reference_mode_check
      check (reference_mode in ('exact', 'starts'));
  end if;
end $$;

comment on column public.search_history.designation is 'Désignation recherchée (mode « contient ») — facultatif.';
comment on column public.search_history.reference_mode is 'Mode de recherche de la référence : exact (défaut) ou starts (commence par).';