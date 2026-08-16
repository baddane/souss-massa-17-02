-- Suivi des candidatures par l'entreprise, et garde pour la notification email.

-- Un seul email par candidature, meme en cas de rejeu de l'appel.
alter table public.candidatures add column if not exists notified_company boolean not null default false;

-- L'entreprise peut suivre les candidatures recues sur SES offres.
drop policy if exists cand_company_update on public.candidatures;
create policy cand_company_update on public.candidatures
  for update to authenticated
  using (
    public.is_validated_company()
    and exists (select 1 from public.job_offers o
                where o.ref_offre = candidatures.job_ref and o.company_id = auth.uid())
  )
  with check (
    public.is_validated_company()
    and exists (select 1 from public.job_offers o
                where o.ref_offre = candidatures.job_ref and o.company_id = auth.uid())
  );

-- Une policy ne restreint pas les COLONNES : sans ce trigger, une entreprise
-- pourrait reecrire l'identite du candidat, le chemin de son CV, ou le drapeau
-- de notification. Seuls `status` et `notes` restent modifiables.
--
-- La liste des valeurs de `status` n'est volontairement PAS reprise ici : elle
-- est deja portee par la contrainte `candidatures_status_check`. La dupliquer
-- garantissait une divergence — c'est exactement ce qui s'est produit lors de
-- l'ecriture de cette migration (trigger 'preselection' vs contrainte
-- 'présélection').
create or replace function public.candidatures_company_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  new.id               := old.id;
  new.created_at       := old.created_at;
  new.job_ref          := old.job_ref;
  new.job_title        := old.job_title;
  new.company_name     := old.company_name;
  new.candidate_name   := old.candidate_name;
  new.candidate_email  := old.candidate_email;
  new.candidate_phone  := old.candidate_phone;
  new.cv_url           := old.cv_url;
  new.cv_filename      := old.cv_filename;
  new.cv_path          := old.cv_path;
  new.notified_company := old.notified_company;

  if new.status is null then
    new.status := old.status;
  end if;

  return new;
end;
$$;

revoke execute on function public.candidatures_company_guard() from anon, authenticated;

drop trigger if exists candidatures_company_guard on public.candidatures;
create trigger candidatures_company_guard
  before update on public.candidatures
  for each row execute function public.candidatures_company_guard();
