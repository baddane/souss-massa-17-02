-- Un compte administrateur ne doit jamais porter de fiche entreprise.
--
-- Incident a l'origine : une inscription entreprise remplie depuis un navigateur
-- ou l'admin etait connecte. `supabase.auth.signUp()` avec une session active ne
-- cree PAS de compte, il renvoie l'utilisateur courant — la fiche entreprise
-- s'est donc greffee sur le compte admin. Cette fiche etait ensuite impossible a
-- supprimer, `api/delete-company` refusant (a juste titre) de toucher un admin.
--
-- Triple correction :
--   1. front : `companyAuth.signUp` ferme toute session avant l'inscription et
--      verifie que le compte renvoye correspond bien a l'email saisi ;
--   2. api/delete-company : supprime desormais la fiche entreprise meme quand le
--      compte est admin, en preservant le compte Auth (plus de fiche indelebile) ;
--   3. base : la regle ci-dessous, qui interdit le cas a la source.
--
-- `is_admin()` est SECURITY DEFINER : elle lit `app_admins` malgre sa RLS sans
-- policy. Une sous-requete directe sur `app_admins` ne renverrait rien ici et la
-- verification passerait toujours.

drop policy if exists ce_insert on public.comptes_entreprise;
create policy ce_insert on public.comptes_entreprise
  for insert to authenticated
  with check (
    id = auth.uid()
    and statut = 'en_attente'
    and not public.is_admin()
  );
