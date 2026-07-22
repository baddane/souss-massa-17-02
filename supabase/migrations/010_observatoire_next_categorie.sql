-- Équilibrage automatique des rubriques de l'Observatoire.
-- next_observatoire_categorie() renvoie la rubrique à traiter ensuite : celle publiée
-- le moins récemment (jamais publiée en priorité), puis la moins représentée, puis
-- ordre fixe. La routine l'appelle pour éviter de concentrer les articles sur une rubrique.
create or replace function public.next_observatoire_categorie()
returns text
language sql
stable
as $$
  with cats(categorie, prio) as (
    values ('chomage', 1), ('actualite', 2), ('strategie', 3), ('veille', 4)
  ),
  agg as (
    select categorie, max(date_publi) as last_publi, count(*) as n
    from public.observatoire_articles
    where statut = 'publie'
    group by categorie
  )
  select c.categorie
  from cats c
  left join agg a on a.categorie = c.categorie
  order by
    coalesce(a.last_publi, '0000-00-00') asc,
    coalesce(a.n, 0) asc,
    c.prio asc
  limit 1;
$$;

grant execute on function public.next_observatoire_categorie() to anon, authenticated;
