-- ============================================================
-- Prospection : les nouvelles offres alimentent la liste des cibles
--
-- `outreach_targets` avait ete remplie UNE FOIS depuis `job_offers`, et plus
-- rien ne la realimentait. Constat du 2026-09-13 : **27 employeurs** avec des
-- offres en ligne n'apparaissaient pas dans l'onglet Prospection, dont des
-- imports du jour meme (Credit agricole, Moulim Group, ORH Assessment…).
-- Invisibles dans Prospection, ils sont hors de la campagne : ni compte, ni
-- identifiants, ni invitation. Autrement dit, tout le travail de scraping
-- n'alimentait plus le seul canal qui le monetise.
--
-- Un TRIGGER plutot qu'un rappel HTTP, pour la raison de la migration `027` :
-- le rappel de `scripts/insert-offers.cjs` exige `CRON_SECRET` et, sans lui,
-- abandonne silencieusement. Un trigger ne depend d'aucune variable
-- d'environnement et couvre TOUS les chemins d'ecriture (import en anon ou
-- service_role, SQL direct, dashboard).
-- ============================================================

-- 1) Slug de la page vitrine /recrutement/{slug} -----------------------------
-- Doit rester rigoureusement equivalent a `slugify()` de components/SEO.tsx et
-- a `slugifyCompany()` de api/prerender.ts, sinon la cible de prospection
-- pointe vers une page qui n'existe pas.
create or replace function public.outreach_slug(nom text)
returns text language sql stable
set search_path = public as $$
  select btrim(regexp_replace(lower(public.unaccent(coalesce(nom, ''))), '[^a-z0-9]+', '-', 'g'), '-');
$$;

-- 2) Nom designant une societe identifiable ---------------------------------
-- Memes exclusions que `nomProvisionnable` cote serveur. « Entreprise
-- confidentielle » couvre a elle seule 112 offres d'employeurs differents : en
-- faire une cible de prospection ferait envoyer les identifiants d'un compte
-- fourre-tout, donc les candidatures de dizaines de societes, a une seule.
create or replace function public.nom_entreprise_identifiable(nom text)
returns boolean language sql immutable
set search_path = public as $$
  select length(btrim(coalesce(nom, ''))) between 3 and 60
     and btrim(nom) !~* 'confidentiel'
     and btrim(nom) !~* '^x+$'
     and btrim(nom) !~* '^anonyme$'
     and btrim(nom) !~* '^(entreprise|societe|société|company)$'
     and btrim(nom) !~* '^(n/?a|nc|-+)$';
$$;

-- Le slug identifie la cible : sans unicite, `on conflict` ne peut pas arbitrer
-- et deux imports simultanes creeraient deux lignes pour le meme employeur.
create unique index if not exists outreach_targets_slug_uq on public.outreach_targets (slug);

-- 3) Le trigger --------------------------------------------------------------
create or replace function public.outreach_sync_offre()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_nom    text := btrim(coalesce(new.raison_sociale, ''));
  v_offres int;
  v_postes int;
  v_villes text;
begin
  -- Seules les offres publiques et SANS proprietaire : une offre deposee par
  -- une entreprise deja inscrite n'a rien a faire dans une liste de prospection.
  if new.statut is distinct from 'active' or new.company_id is not null then
    return new;
  end if;
  if not public.nom_entreprise_identifiable(v_nom) then
    return new;
  end if;
  -- Deja un compte a ce nom : il n'y a plus rien a prospecter.
  if exists (select 1 from public.comptes_entreprise ce
             where lower(btrim(ce.nom_entreprise)) = lower(v_nom)) then
    return new;
  end if;

  select count(*), coalesce(sum(coalesce(nbre_postes, 1)), 0), string_agg(distinct ville, ', ')
    into v_offres, v_postes, v_villes
  from public.job_offers
  where statut = 'active' and lower(btrim(raison_sociale)) = lower(v_nom);

  -- `do update` ne touche QUE les compteurs : `statut`, `email`, `date_contact`
  -- et `notes` sont le travail de l'admin. Une nouvelle offre ne doit pas
  -- repasser en « a contacter » une entreprise deja contactee.
  insert into public.outreach_targets (raison_sociale, slug, ville, nb_offres, postes)
  values (v_nom, public.outreach_slug(v_nom), v_villes, v_offres, v_postes)
  on conflict (slug) do update
    set nb_offres = excluded.nb_offres,
        postes    = excluded.postes,
        ville     = coalesce(excluded.ville, public.outreach_targets.ville);

  return new;
exception when others then
  -- Ne JAMAIS faire echouer un import a cause de la liste de prospection :
  -- les offres comptent plus que la liste, et la liste se rattrape.
  return new;
end;
$$;

drop trigger if exists outreach_sync_offre on public.job_offers;
create trigger outreach_sync_offre
  after insert on public.job_offers
  for each row execute function public.outreach_sync_offre();

-- 4) Rattrapage des employeurs deja en ligne et absents de la liste ----------
insert into public.outreach_targets (raison_sociale, slug, ville, nb_offres, postes)
select e.nom, public.outreach_slug(e.nom), e.villes, e.nb_offres, e.postes
from (
  select btrim(raison_sociale) as nom,
         count(*) as nb_offres,
         coalesce(sum(coalesce(nbre_postes, 1)), 0) as postes,
         string_agg(distinct ville, ', ') as villes
  from public.job_offers
  where statut = 'active' and company_id is null
    and public.nom_entreprise_identifiable(btrim(raison_sociale))
  group by 1
) e
where not exists (select 1 from public.outreach_targets o
                  where o.slug = public.outreach_slug(e.nom))
  and not exists (select 1 from public.comptes_entreprise ce
                  where lower(btrim(ce.nom_entreprise)) = lower(e.nom))
on conflict (slug) do nothing;

-- 5) Fonctions non appelables depuis l'API REST ------------------------------
-- Sur une fonction NOUVELLE, Supabase pose des GRANT nominatifs a `anon` et
-- `authenticated` : revoquer a `public` seul ne retire rien (cf. `027`, `031`).
do $$
declare f text;
begin
  foreach f in array array[
    'public.outreach_slug(text)',
    'public.nom_entreprise_identifiable(text)',
    'public.outreach_sync_offre()'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('revoke all on function %s from authenticated', f);
  end loop;
end $$;
