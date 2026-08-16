-- L'entreprise gere ses propres offres : modification et retrait.
--
-- Etat de depart : les policies d'ecriture de `job_offers` ne visaient que le
-- role `anon` (scripts d'import). Une entreprise connectee est en role
-- `authenticated` : elle ne pouvait donc ni modifier ni retirer ses offres.
--
-- Choix : pas de suppression definitive cote entreprise. Les candidatures sont
-- reliees a l'offre par `job_ref` = `ref_offre` ; supprimer la ligne ferait
-- perdre a l'entreprise l'acces aux candidatures deja recues. « Retirer » pose
-- donc `statut = 'retire'`, ce qui masque l'offre du public (toutes les vues
-- publiques filtrent sur `statut = 'active'`) sans rien detruire.

drop policy if exists job_offers_company_update on public.job_offers;
create policy job_offers_company_update on public.job_offers
  for update to authenticated
  using (company_id = auth.uid() and public.is_validated_company())
  with check (company_id = auth.uid());

-- Une policy ne sait pas restreindre les COLONNES : sans ce trigger, une
-- entreprise pourrait publier son offre elle-meme (`statut = 'active'`) ou la
-- reattribuer a une autre entreprise. On fige donc l'identite de l'offre et on
-- borne les statuts qu'elle peut poser.
--
-- `auth.uid() is null` = SQL direct / service_role / scripts d'import en anon :
-- le garde-fou ne s'applique pas, l'import et l'admin gardent la main.
create or replace function public.job_offers_company_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Identite de l'offre non modifiable par l'entreprise
  new.id         := old.id;
  new.company_id := old.company_id;
  new.ref_offre  := old.ref_offre;
  new.created_at := old.created_at;
  new.source     := old.source;

  -- Seuls le retrait et la remise en moderation sont autorises : toute autre
  -- valeur (dont 'active') renvoie l'offre en validation admin.
  if new.statut is distinct from 'retire' then
    new.statut := 'en_attente';
  end if;

  return new;
end;
$$;

drop trigger if exists job_offers_company_guard on public.job_offers;
create trigger job_offers_company_guard
  before update on public.job_offers
  for each row execute function public.job_offers_company_guard();
