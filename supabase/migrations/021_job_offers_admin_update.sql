-- L'admin doit pouvoir valider / refuser une offre deposee par une entreprise.
--
-- Manque PREEXISTANT (anterieur a la migration 016) : les seules policies UPDATE
-- sur `job_offers` visaient le role `anon` (scripts d'import) et, depuis 016,
-- l'entreprise proprietaire. L'admin est `authenticated` et ne possede pas
-- l'offre : aucune regle ne s'appliquait a lui. La requete renvoyait 204 sans
-- modifier la moindre ligne — echec parfaitement silencieux, l'offre restait
-- « en attente » apres rafraichissement.
--
-- Reste invisible tant qu'aucune entreprise ne depose d'offre : les 442 offres
-- existantes ont ete inserees en `active` par les scripts, en role anon.
drop policy if exists job_offers_admin_update on public.job_offers;
create policy job_offers_admin_update on public.job_offers
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Verifie apres application, avec un compte admin temporaire :
--   en_attente -> active  OK
--   active     -> refuse  OK
--   refuse     -> active  OK
--
-- Controle systematique mene dans la foulee sur toutes les tables ecrites par
-- l'admin (job_offers, candidatures, messages, cvtheque, comptes_entreprise,
-- observatoire_articles, outreach_targets) : plus aucun droit manquant, hors
-- deux cas voulus — l'admin ne supprime jamais d'offre (regle du projet) et
-- n'a pas besoin d'inserer dans `messages` (formulaire public, role anon).
