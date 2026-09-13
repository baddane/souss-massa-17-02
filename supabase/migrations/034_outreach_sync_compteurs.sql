-- ============================================================
-- Prospection : mettre a jour les compteurs meme pour une entreprise inscrite
--
-- La `033` sortait des qu'un compte existait au nom de l'employeur. Correct
-- pour ne pas CREER une cible inutile — mais elle empechait aussi la mise a
-- jour d'une ligne DEJA presente. Or la campagne d'acces s'adresse justement
-- aux entreprises qui ont un compte sans le savoir : leur ligne reste dans la
-- liste, et l'admin y trie par nombre de postes. Une entreprise passee de 3 a
-- 10 offres continuait d'afficher 3.
--
-- Regle corrigee : le compte existant empeche la CREATION d'une ligne, jamais
-- la mise a jour d'une ligne existante.
-- ============================================================

create or replace function public.outreach_sync_offre()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_nom    text := btrim(coalesce(new.raison_sociale, ''));
  v_slug   text;
  v_offres int;
  v_postes int;
  v_villes text;
begin
  if new.statut is distinct from 'active' or new.company_id is not null then
    return new;
  end if;
  if not public.nom_entreprise_identifiable(v_nom) then
    return new;
  end if;

  v_slug := public.outreach_slug(v_nom);

  -- Un compte existe deja et aucune ligne de prospection : il n'y a rien a
  -- prospecter, l'entreprise se pilote depuis l'onglet Identifiants.
  if not exists (select 1 from public.outreach_targets o where o.slug = v_slug)
     and exists (select 1 from public.comptes_entreprise ce
                 where lower(btrim(ce.nom_entreprise)) = lower(v_nom)) then
    return new;
  end if;

  select count(*), coalesce(sum(coalesce(nbre_postes, 1)), 0), string_agg(distinct ville, ', ')
    into v_offres, v_postes, v_villes
  from public.job_offers
  where statut = 'active' and lower(btrim(raison_sociale)) = lower(v_nom);

  -- `do update` ne touche QUE les compteurs : `statut`, `email`, `date_contact`
  -- et `notes` sont le travail de l'admin.
  insert into public.outreach_targets (raison_sociale, slug, ville, nb_offres, postes)
  values (v_nom, v_slug, v_villes, v_offres, v_postes)
  on conflict (slug) do update
    set nb_offres = excluded.nb_offres,
        postes    = excluded.postes,
        ville     = coalesce(excluded.ville, public.outreach_targets.ville);

  return new;
exception when others then
  -- Ne JAMAIS faire echouer un import a cause de la liste de prospection.
  return new;
end;
$$;

revoke all on function public.outreach_sync_offre() from public;
revoke all on function public.outreach_sync_offre() from anon;
revoke all on function public.outreach_sync_offre() from authenticated;

-- Remise a niveau des compteurs de toutes les lignes existantes.
update public.outreach_targets o
set nb_offres = c.nb, postes = c.postes, ville = coalesce(c.villes, o.ville)
from (
  select btrim(raison_sociale) as nom, count(*) as nb,
         coalesce(sum(coalesce(nbre_postes, 1)), 0) as postes,
         string_agg(distinct ville, ', ') as villes
  from public.job_offers where statut = 'active' group by 1
) c
where lower(o.raison_sociale) = lower(c.nom)
  and (o.nb_offres is distinct from c.nb or o.postes is distinct from c.postes);
