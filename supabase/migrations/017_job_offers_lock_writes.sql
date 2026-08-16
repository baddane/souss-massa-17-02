-- ############################################################################
-- ##  MIGRATION NON APPLIQUEE — A LANCER SEULEMENT APRES LA BASCULE DE CLE   ##
-- ############################################################################
--
-- Verrouille les ecritures anonymes sur `job_offers`.
--
-- ETAT ACTUEL (risque) : les policies `Anon can insert/update/delete offers` et
-- `Allow anonymous insert access` autorisent n'importe qui disposant de la cle
-- anon — qui est publique, elle est dans le bundle du site — a creer, modifier
-- ou supprimer n'importe quelle offre. C'est la faille la plus large qui reste.
--
-- PREREQUIS AVANT D'APPLIQUER (sinon les imports cassent en silence) :
--   1. Creer le secret GitHub `SUPABASE_SERVICE_ROLE_KEY`
--      (Settings > Secrets and variables > Actions). Les deux workflows le
--      transmettent deja aux scripts.
--   2. En local, exporter la meme variable avant de lancer un import :
--        export SUPABASE_SERVICE_ROLE_KEY='...'
--   3. Verifier au lancement que les scripts affichent bien
--      « cle service_role detectee » et non « cle anon (repli) ».
--   4. Lancer un import a blanc (`node scripts/insert-offers.cjs <fichier>`)
--      et confirmer qu'il ecrit correctement.
--
-- Ce qui continue de fonctionner apres application :
--   - lecture publique des offres (policy `Allow public read access`) ;
--   - depot d'offre par une entreprise connectee (role `authenticated`) —
--     ATTENTION : la policy d'insertion `Allow anonymous insert access` porte
--     sur le role `public`, qui couvre `authenticated`. Elle est donc remplacee
--     ci-dessous par une policy explicite reservee aux entreprises validees ;
--   - modification / retrait de ses offres par l'entreprise (migration 016) ;
--   - scripts d'import et admin via `service_role`, qui contourne la RLS.

-- 1. Suppression des ecritures anonymes
drop policy if exists "Anon can insert offers"          on public.job_offers;
drop policy if exists "Anon can update offers"          on public.job_offers;
drop policy if exists "Anon can delete offers"          on public.job_offers;
drop policy if exists "Allow anonymous insert access"   on public.job_offers;

-- 2. Depot d'offre par une entreprise validee, pour elle-meme et en attente de
--    moderation. Remplace l'insertion ouverte precedente.
drop policy if exists job_offers_company_insert on public.job_offers;
create policy job_offers_company_insert on public.job_offers
  for insert to authenticated
  with check (
    company_id = auth.uid()
    and public.is_validated_company()
    and statut = 'en_attente'
    and source = 'entreprise'
  );

-- 3. La lecture publique reste inchangee (`Allow public read access`).
--    Les suppressions ne sont plus possibles que via `service_role` / SQL.
