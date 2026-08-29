-- Rattachement automatique d'une offre nouvellement inseree au compte de
-- l'entreprise qui la publie.
--
-- POURQUOI EN BASE ET PAS DANS LE SCRIPT D'IMPORT : le rattachement se faisait
-- via un rappel HTTP de `scripts/insert-offers.cjs` vers
-- `api/provision-companies.ts`. Ce rappel exige CRON_SECRET ; sans lui le script
-- abandonne silencieusement — par conception, pour ne pas faire echouer un
-- import par ailleurs reussi. Resultat observe le 2026-08-28 : 12 offres
-- importees les 25-28 aout appartenant a des entreprises DEJA inscrites
-- (Manpower, AZURA GROUP, ECO TERRE, Artus, Vital Fer, Fondation Arrawaj)
-- n'apparaissaient pas dans leur tableau de bord. C'est precisement ce qui ruine
-- la prospection : l'entreprise demarchee se connecte et ne voit pas ses offres
-- du jour.
--
-- Un trigger ne depend d'aucune variable d'environnement ni d'aucun appel
-- reseau, et couvre TOUS les chemins d'ecriture : script d'import (cle anon ou
-- service_role), SQL direct, dashboard Supabase, depot depuis l'espace
-- entreprise.
--
-- LES GARDE-FOUS SONT LES MEMES QUE CEUX DU BOUTON ADMIN, ET NE DOIVENT PAS
-- ETRE ASSOUPLIS : un rattachement errone donnerait a une entreprise l'acces aux
-- CV et aux coordonnees des candidats d'une autre.
--   1. correspondance EXACTE sur la raison sociale (casse et espaces de bord
--      ignores, car les scrapers varient sur ces deux points seulement) ;
--   2. un SEUL compte valide correspondant — sinon on ne tranche pas ;
--   3. les raisons sociales generiques sont exclues : « Entreprise
--      confidentielle » couvre a elle seule 71 offres de societes differentes ;
--   4. jamais d'ecrasement : on ne pose company_id que s'il est nul.

create or replace function public.job_offers_auto_claim()
returns trigger
language plpgsql
security definer                 -- doit lire comptes_entreprise, protegee par RLS
set search_path = public, pg_temp
as $$
declare
  v_nom     text := trim(coalesce(new.raison_sociale, ''));
  v_comptes uuid[];
begin
  -- Offre deja rattachee (depot depuis l'espace entreprise) : ne rien faire.
  if new.company_id is not null then
    return new;
  end if;

  -- Nom inexploitable ou generique : on laisse l'offre sans proprietaire.
  if length(v_nom) < 3 or length(v_nom) > 60
     or v_nom ~* 'confidentiel|^x+$|^anonyme$|^(entreprise|societe|société|company)$|^(n/?a|nc|-+|\.+)$' then
    return new;
  end if;

  -- Un seul compte valide portant exactement ce nom, sinon on s'abstient :
  -- deux homonymes, c'est deux societes, et on ne devine pas laquelle recrute.
  -- On agrege en tableau plutot que d'agreger l'identifiant : min(uuid) n'existe
  -- pas en Postgres, et une telle erreur ferait echouer l'INSERT tout entier —
  -- donc l'import complet, ce qui serait bien pire que le defaut corrige ici.
  select array_agg(ce.id) into v_comptes
  from public.comptes_entreprise ce
  where lower(trim(ce.nom_entreprise)) = lower(v_nom)
    and ce.statut = 'valide';

  if coalesce(array_length(v_comptes, 1), 0) = 1 then
    new.company_id := v_comptes[1];
  end if;

  return new;
end;
$$;

comment on function public.job_offers_auto_claim() is
  'Rattache une offre inseree au compte entreprise portant exactement la meme raison sociale (un seul compte valide, noms generiques exclus). Remplace le rappel HTTP du script d''import, qui dependait de CRON_SECRET.';

drop trigger if exists job_offers_auto_claim on public.job_offers;
create trigger job_offers_auto_claim
  before insert on public.job_offers
  for each row execute function public.job_offers_auto_claim();

-- Fermeture de l'acces RPC. ATTENTION, C'EST L'INVERSE DE LA MIGRATION 023 :
-- la, le droit venait du GRANT implicite a PUBLIC. Ici, sur une fonction
-- NOUVELLE, Supabase pose des GRANT NOMINATIFS a anon et authenticated via ses
-- default privileges (proacl = {postgres=X, anon=X, authenticated=X,
-- service_role=X}). Un `revoke from public` seul ne retire donc RIEN, et
-- l'advisor securite continue — a juste titre — de signaler la fonction comme
-- appelable via /rest/v1/rpc/job_offers_auto_claim. Il faut revoquer aux trois.
--
-- Verifie en conditions reelles : apres revocation, un INSERT execute en role
-- `anon` (le cas du script d'import sans SUPABASE_SERVICE_ROLE_KEY) rattache
-- toujours l'offre. Un trigger s'execute avec les droits du proprietaire de la
-- table ; l'appelant n'a jamais besoin d'EXECUTE sur la fonction.
revoke execute on function public.job_offers_auto_claim() from public;
revoke execute on function public.job_offers_auto_claim() from anon;
revoke execute on function public.job_offers_auto_claim() from authenticated;
