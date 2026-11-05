-- File d'envoi de l'admin (« Messages préparés »).
--
-- Regle de l'exploitant du 05/11/2026 : TOUT e-mail part depuis l'admin du
-- site, au gabarit du site et depuis contact@soussmassa-rh.com, plus jamais
-- depuis un Gmail connecte. Un message prepare hors de l'interface (session
-- Claude, routine) est depose ici ; l'admin le relit, le corrige au besoin et
-- clique « Envoyer » (api/send-outbox.ts). Rien ne part sans ce clic.
create table if not exists public.outbox (
  id          uuid primary key default gen_random_uuid(),
  to_email    text not null,
  to_name     text,
  subject     text not null,
  body        text not null,       -- texte brut, paragraphes separes par une ligne vide
  note        text,                -- contexte pour l'admin, jamais envoye
  statut      text not null default 'a_envoyer'
              check (statut in ('a_envoyer', 'envoi_en_cours', 'envoye', 'abandonne')),
  erreur      text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
alter table public.outbox enable row level security;

-- Admin uniquement, comme toutes les donnees de prospection.
drop policy if exists outbox_admin_all on public.outbox;
create policy outbox_admin_all on public.outbox
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
