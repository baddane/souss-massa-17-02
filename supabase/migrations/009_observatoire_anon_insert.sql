-- Publication 100% automatique de l'Observatoire : la routine insère avec la clé anon
-- (comme le pipeline d'offres), sans secret. UPDATE/DELETE restent réservés à l'admin
-- (obs_admin_write) → les articles existants ne peuvent pas être modifiés/supprimés par un tiers.
drop policy if exists obs_anon_insert on public.observatoire_articles;
create policy obs_anon_insert on public.observatoire_articles
  for insert to anon, authenticated
  with check (true);
