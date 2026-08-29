-- ============================================================
-- Identifiants des comptes entreprise provisionnés par l'admin
-- ============================================================
--
-- OBJET : la plateforme provisionne des comptes pour les entreprises qui
-- recrutent deja sur le site, afin de leur envoyer un identifiant et un mot de
-- passe prets a l'emploi. L'admin doit pouvoir relire ce mot de passe pour le
-- (re)transmettre : il est donc conserve en clair.
--
-- POURQUOI UNE TABLE SEPAREE, ET PAS UNE COLONNE SUR `comptes_entreprise` :
-- la policy `ce_select` autorise une entreprise a lire SA PROPRE fiche. Poser
-- le mot de passe sur cette table le rendrait lisible par le client (cle anon)
-- de l'entreprise concernee. Sans danger pour les autres, mais inutile — et une
-- colonne de plus a ne jamais oublier de filtrer. Ici, RLS admin uniquement.
--
-- RISQUE ASSUME ET DOCUMENTE : un acces au compte admin donne acces a tous ces
-- mots de passe, donc a tous les espaces entreprise, donc aux CV et coordonnees
-- des candidats. La contrepartie est operationnelle : sans cela, impossible de
-- renvoyer ses identifiants a une entreprise qui les a perdus.

create table if not exists public.company_credentials (
  company_id      uuid primary key references public.comptes_entreprise(id) on delete cascade,
  email           text not null,
  mot_de_passe    text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Date du dernier envoi des identifiants, pour ne pas ecrire deux fois a la
  -- meme entreprise et savoir ou en est la campagne.
  envoye_le       timestamptz,
  -- 'auto' = cree par le provisionnement (import d'offres, cron),
  -- 'manuel' = cree a la main depuis l'admin.
  origine         text not null default 'auto',
  note            text
);

create index if not exists company_credentials_email_idx
  on public.company_credentials (lower(email));

create or replace function public.company_credentials_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.company_credentials_touch() from public, anon, authenticated;

drop trigger if exists company_credentials_touch on public.company_credentials;
create trigger company_credentials_touch before update on public.company_credentials
  for each row execute function public.company_credentials_touch();

alter table public.company_credentials enable row level security;

-- Admin uniquement, en lecture comme en ecriture. Aucune policy pour `anon`.
drop policy if exists company_credentials_admin_all on public.company_credentials;
create policy company_credentials_admin_all on public.company_credentials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
