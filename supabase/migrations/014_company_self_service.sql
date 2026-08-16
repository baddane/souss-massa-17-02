-- Espace entreprise en self-service : une entreprise validee peut consulter les
-- candidatures recues sur SES offres (CV compris) et la CVtheque.
--
-- Rappel du modele : `candidatures.job_ref` = `job_offers.ref_offre`, et le CV est
-- stocke dans le bucket prive `cvs` sous `{ref_offre}/{fichier}` (voir
-- components/ApplyModal.tsx). Le cloisonnement se fait donc par `ref_offre`.

-- Une entreprise n'a acces a rien tant que l'admin ne l'a pas validee.
create or replace function public.is_validated_company()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.comptes_entreprise c
    where c.id = auth.uid() and c.statut = 'valide'
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Candidatures recues sur ses propres offres (lecture seule)
-- ---------------------------------------------------------------------------
drop policy if exists cand_company_select on public.candidatures;
create policy cand_company_select on public.candidatures
  for select to authenticated
  using (
    public.is_validated_company()
    and exists (
      select 1 from public.job_offers o
      where o.ref_offre = candidatures.job_ref
        and o.company_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. CV des candidats (bucket `cvs`)
-- ---------------------------------------------------------------------------
-- FAILLE PREEXISTANTE : `cvs_storage_read_authenticated` autorisait
-- `bucket_id = 'cvs'` pour TOUT compte authentifie, sans autre condition. Elle
-- etait sans effet tant que seuls les admins se connectaient, mais aurait donne
-- a chaque entreprise l'acces aux CV de toutes les autres. On la remplace par un
-- acces limite aux CV deposes sur ses propres offres.
drop policy if exists cvs_storage_read_authenticated on storage.objects;

drop policy if exists cvs_company_read on storage.objects;
create policy cvs_company_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and public.is_validated_company()
    and exists (
      select 1 from public.job_offers o
      where o.company_id = auth.uid()
        and o.ref_offre = split_part(storage.objects.name, '/', 1)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. CVtheque : consultation et telechargement par les entreprises validees
-- ---------------------------------------------------------------------------
-- Choix produit assume : la CVtheque devient une base de sourcing ouverte aux
-- entreprises validees. Elle contient des donnees personnelles (identite,
-- contact, CV) — l'acces reste refuse aux visiteurs anonymes et aux comptes non
-- valides, et la creation / modification / suppression demeure admin.
drop policy if exists cvtheque_company_select on public.cvtheque;
create policy cvtheque_company_select on public.cvtheque
  for select to authenticated
  using (public.is_validated_company());

drop policy if exists cvtheque_company_read on storage.objects;
create policy cvtheque_company_read on storage.objects
  for select to authenticated
  using (bucket_id = 'cvtheque' and public.is_validated_company());

-- La CVtheque agrege aussi les CV recus en candidature (migration 007) : ces
-- lignes pointent vers le bucket `cvs`. Sans cette policy, la moitie des
-- telechargements de la CVtheque echouerait pour une entreprise.
-- Consequence assumee : une entreprise validee peut telecharger, VIA LA
-- CVTHEQUE, un CV depose sur l'offre d'une autre entreprise. Pour revenir en
-- arriere, supprimer cette seule policy : le reste de la CVtheque continue de
-- fonctionner, seuls ces CV-la redeviennent inaccessibles.
drop policy if exists cvs_company_read_via_cvtheque on storage.objects;
create policy cvs_company_read_via_cvtheque on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and public.is_validated_company()
    and exists (
      select 1 from public.cvtheque c
      where c.bucket = 'cvs' and c.file_path = storage.objects.name
    )
  );
