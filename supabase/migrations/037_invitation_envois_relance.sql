-- Journal des invitations : accepter le statut « relance »
--
-- Une relance (api/_relance.ts) ne contient aucun identifiant et ne pose pas
-- `company_credentials.envoye_le`. Elle doit se distinguer d'une invitation
-- dans le journal : c'est ce statut qui empeche de relancer deux fois la meme
-- entreprise.
alter table public.invitation_envois drop constraint if exists invitation_envois_statut_check;
alter table public.invitation_envois add constraint invitation_envois_statut_check
  check (statut = any (array['envoye'::text, 'echec'::text, 'test'::text, 'relance'::text]));
