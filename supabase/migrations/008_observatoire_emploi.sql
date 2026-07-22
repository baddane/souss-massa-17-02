-- ============================================================
-- Observatoire de l'emploi Souss-Massa : articles éditoriaux
-- (stats chômage, actualité, stratégie régionale, veille)
-- ============================================================
create table if not exists public.observatoire_articles (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  slug           text unique not null,
  titre          text not null,
  categorie      text not null default 'actualite'
                 check (categorie in ('chomage','actualite','strategie','veille')),
  chapo          text,
  contenu        text,                              -- markdown (+ jetons [[chart:N]])
  charts         jsonb not null default '[]',       -- specs de diagrammes (SVG maison)
  cover_emoji    text,
  meta_title     text,
  meta_description text,
  seo_keywords   text[] default '{}',
  sources        text[] default '{}',
  date_publi     text not null default (to_char(now(),'YYYY-MM-DD'))
                 check (date_publi ~ '^\d{4}-\d{2}-\d{2}$'),
  temps_lecture  integer default 3,
  auteur         text default 'Observatoire SoussMassa-RH',
  statut         text not null default 'publie' check (statut in ('publie','brouillon'))
);

create index if not exists obs_articles_publi_idx on public.observatoire_articles (statut, date_publi desc);
create index if not exists obs_articles_cat_idx   on public.observatoire_articles (categorie);

alter table public.observatoire_articles enable row level security;

-- Lecture publique : uniquement les articles publiés (l'admin voit tout)
drop policy if exists obs_public_read on public.observatoire_articles;
create policy obs_public_read on public.observatoire_articles
  for select to anon, authenticated
  using (statut = 'publie' or public.is_admin());

-- Écriture réservée à l'admin (la routine utilise la clé service_role qui bypass RLS)
drop policy if exists obs_admin_write on public.observatoire_articles;
create policy obs_admin_write on public.observatoire_articles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
