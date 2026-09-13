-- ============================================================
-- Journal des invitations : accepter le statut « test »
--
-- L'envoi de test (bouton « Envoyer un test » de l'onglet Prospection) part
-- vers l'adresse de l'admin, pas vers l'entreprise. Il doit laisser une trace
-- — savoir qu'un test a ete fait, et vers ou — mais ne doit JAMAIS etre
-- confondu avec un envoi reel : sans statut distinct, une entreprise
-- apparaitrait comme contactee alors que personne chez elle n'a rien recu.
--
-- `destinataire` porte alors l'adresse de test, et non celle de l'entreprise.
-- ============================================================

alter table public.invitation_envois drop constraint if exists invitation_envois_statut_check;
alter table public.invitation_envois add constraint invitation_envois_statut_check
  check (statut = any (array['envoye'::text, 'echec'::text, 'test'::text]));
