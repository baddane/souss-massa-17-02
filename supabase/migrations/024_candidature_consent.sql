-- Consentement explicite au moment de la candidature.
--
-- Jusqu'ici, postuler a une offre faisait entrer le CV dans la CVtheque
-- consultee par toutes les entreprises validees, sans que le candidat en soit
-- informe ni puisse s'y opposer. La case a cocher du formulaire de candidature
-- alimente desormais `consent_cvtheque`, et le trigger de synchronisation la
-- respecte.
--
-- Valeur par defaut `true` : les 234 candidatures existantes gardent leur
-- comportement actuel, aucune fiche ne disparait retroactivement.

alter table public.candidatures
  add column if not exists consent_cvtheque boolean not null default true;

create or replace function public.sync_candidature_to_cvtheque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.candidate_email is not null and new.candidate_email <> '' and new.cv_path is not null then
    begin
      insert into public.cvtheque (nom_complet, email, telephone, poste, file_path, file_name,
                                   bucket, source, visible_recruteurs)
      select new.candidate_name, new.candidate_email, new.candidate_phone, new.job_title,
             new.cv_path, new.cv_filename, 'cvs', 'candidature', coalesce(new.consent_cvtheque, true)
      where not exists (
        select 1 from public.cvtheque c
        where c.source = 'candidature' and lower(c.email) = lower(new.candidate_email)
      );

      -- Une fiche existe deja pour cet email : on n'y touche que pour appliquer
      -- un REFUS. Un consentement donne ici ne doit pas re-exposer un profil que
      -- le candidat avait explicitement masque depuis son espace — sinon la case
      -- a cocher d'un formulaire annulerait un choix plus fort.
      if new.consent_cvtheque is false then
        update public.cvtheque
           set visible_recruteurs = false
         where lower(email) = lower(new.candidate_email);
      end if;
    exception when others then
      -- Ne JAMAIS faire echouer une candidature a cause de la CVtheque.
      null;
    end;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_candidature_to_cvtheque() from public, anon, authenticated;

-- Le nouveau champ doit etre fige pour l'entreprise, comme le reste de
-- l'identite du candidat : elle ne doit pas pouvoir reactiver un consentement.
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
  new.consent_cvtheque := old.consent_cvtheque;

  if new.status is null then
    new.status := old.status;
  end if;

  return new;
end;
$$;

revoke execute on function public.candidatures_company_guard() from public, anon, authenticated;
