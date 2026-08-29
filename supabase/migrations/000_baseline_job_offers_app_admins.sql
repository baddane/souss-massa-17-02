-- ============================================================
-- BASELINE : objets créés HORS migration (reconstruits par introspection)
-- ============================================================
--
-- A LIRE AVANT TOUTE MIGRATION DE PROJET.
--
-- La base de production n'a pas ete construite entierement par les fichiers de
-- ce dossier. Deux tables ont ete creees a la main (editeur Supabase) avant que
-- le suivi des migrations existe :
--
--     public.job_offers   (471 lignes, 7 policies, 1 trigger, 4 index)
--     public.app_admins   (1 ligne,  0 policy,  1 index)
--
-- Elles n'apparaissent donc PAS dans `supabase_migrations.schema_migrations`,
-- qui contient par ailleurs le SQL exact des 34 migrations reellement
-- appliquees. Ce fichier comble ce trou : baseline d'abord, historique ensuite.
--
-- Contenu verifie par introspection de la base vivante le 2026-08-29
-- (pg_attribute, pg_constraint, pg_indexes, pg_policies, pg_trigger).

create table if not exists public.job_offers (
  id                   text not null default (gen_random_uuid())::text,
  created_at           timestamp with time zone default now(),
  ville                text not null,
  ref_offre            text not null,
  type_contrat         text not null,
  raison_sociale       text not null,
  date_offre           text not null,
  nbre_postes          integer default 1,
  emploi_metier        text not null,
  full_description     text not null,
  seo_keywords         text[] default '{}'::text[],
  meta_description     text,
  suggested_salary_range text,
  required_skills      text[] default '{}'::text[],
  source               text default 'manual'::text,
  slug                 text,
  statut               text default 'active'::text,
  is_featured          boolean default false,
  emploi_metier_en     text,
  emploi_metier_ar     text,
  full_description_en  text,
  full_description_ar  text,
  meta_description_en  text,
  meta_description_ar  text,
  required_skills_en   text[],
  required_skills_ar   text[],
  company_id           uuid,
  constraint job_offers_pkey primary key (id),
  constraint job_offers_ref_offre_unique unique (ref_offre),
  -- `date_offre` est du TEXTE contraint au format ISO, pas une date : c'est ce
  -- qui fait echouer les insertions en JJ/MM/AAAA (voir CLAUDE.md).
  constraint date_offre_iso_format check (date_offre ~ '^\d{4}-\d{2}-\d{2}$')
);

create index  if not exists idx_job_offers_ref_offre on public.job_offers using btree (ref_offre);
create unique index if not exists idx_job_offers_slug on public.job_offers using btree (slug);

alter table public.job_offers enable row level security;

-- Lecture publique : le site sert les offres avec la cle anon.
drop policy if exists "Allow public read access" on public.job_offers;
create policy "Allow public read access" on public.job_offers
  for select to public using (true);

-- DETTE CONNUE : ecriture ouverte a anon. La cle anon etant publique (elle est
-- dans le bundle du site), n'importe qui peut creer, modifier ou supprimer une
-- offre. Correctif pret : `017_job_offers_lock_writes.sql`, volontairement NON
-- appliquee tant que les scripts d'import n'utilisent pas `service_role`.
-- Une migration de projet est le bon moment pour trancher — mais c'est une
-- decision, pas un detail d'execution : appliquer 017 sans basculer les scripts
-- casse le pipeline `/import-offres`.
drop policy if exists "Allow anonymous insert access" on public.job_offers;
create policy "Allow anonymous insert access" on public.job_offers
  for insert to public with check (true);

drop policy if exists "Anon can insert offers" on public.job_offers;
create policy "Anon can insert offers" on public.job_offers
  for insert to anon with check (true);

drop policy if exists "Anon can update offers" on public.job_offers;
create policy "Anon can update offers" on public.job_offers
  for update to anon using (true) with check (true);

drop policy if exists "Anon can delete offers" on public.job_offers;
create policy "Anon can delete offers" on public.job_offers
  for delete to anon using (true);

-- Table des administrateurs. Volontairement SANS policy : la RLS est active et
-- aucune regle n'existe, donc plus rien n'y accede via l'API. Seule la fonction
-- SECURITY DEFINER `is_admin()` la lit.
create table if not exists public.app_admins (
  id uuid not null,
  constraint app_admins_pkey primary key (id)
);

alter table public.app_admins enable row level security;

-- Les policies `job_offers_admin_update` / `job_offers_company_update` et le
-- trigger `job_offers_company_guard` sont poses par les migrations 016 et 021,
-- rejouees ensuite : ne pas les dupliquer ici.
