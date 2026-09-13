-- Journal des invitations envoyees aux entreprises.
--
-- POURQUOI UNE TABLE ET PAS SEULEMENT `company_credentials.envoye_le` :
-- une date ne dit ni ce qui a ete promis, ni si l'envoi a reussi. Or le message
-- annonce un NOMBRE DE CANDIDATURES ; si une entreprise repond « je n'en vois
-- que 3 », il faut pouvoir dire ce qui lui a ete ecrit, et quand. Une date
-- seule ne permet pas non plus de distinguer « jamais contactee » de « tentee,
-- echouee » — la premiere est une cible, la seconde un probleme a corriger.
--
-- On garde donc l'historique complet : plusieurs lignes par entreprise si
-- plusieurs envois, succes comme echecs.

create table if not exists public.invitation_envois (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.comptes_entreprise(id) on delete cascade,
  -- Recopies et non joints : l'adresse et le nom peuvent changer apres coup
  -- (bouton « Modifier »), le journal doit refleter ce qui a ete envoye CE
  -- jour-la, pas l'etat actuel de la fiche.
  destinataire  text not null,
  nom_entreprise text not null,
  sujet         text not null,
  candidatures  integer not null default 0,
  offres        integer not null default 0,
  statut        text not null default 'envoye' check (statut in ('envoye', 'echec')),
  erreur        text,
  created_at    timestamptz not null default now()
);

create index if not exists invitation_envois_company_idx on public.invitation_envois(company_id);
create index if not exists invitation_envois_date_idx on public.invitation_envois(created_at desc);

-- Meme regime que `company_credentials` : le journal contient les adresses et
-- les volumes de candidatures de chaque entreprise. Admin uniquement.
alter table public.invitation_envois enable row level security;

drop policy if exists invitation_envois_admin_all on public.invitation_envois;
create policy invitation_envois_admin_all on public.invitation_envois
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.invitation_envois is
  'Journal des invitations entreprise : ce qui a ete envoye, a qui, avec quels chiffres, et si cela a abouti.';
