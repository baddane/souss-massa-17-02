-- APPLIQUEE EN PRODUCTION LE 2026-08-29 (version 20260829062908).
-- Recuperee depuis supabase_migrations.schema_migrations : elle avait ete
-- appliquee sans etre versionnee dans le depot.

-- Identifiant technique : quand l'email reel de l'entreprise est inconnu, le
-- compte est cree avec une adresse fabriquee (initiales + annee) qui sert de
-- LOGIN. Elle n'est pas deliverable — d'ou ce drapeau, qui empeche la plateforme
-- de lui envoyer quoi que ce soit. Des rebonds repetes degraderaient la
-- reputation du domaine et feraient retomber en spam les emails legitimes
-- (alertes candidats, notifications de candidature).
alter table public.company_credentials
  add column if not exists email_fictif boolean not null default false;

comment on column public.company_credentials.email_fictif is
  'true = adresse fabriquee servant uniquement de login. Aucun email ne doit etre envoye a cette adresse tant que la vraie n''est pas connue.';
