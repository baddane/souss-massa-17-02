-- ============================================================
-- Bascule des CV des postulants vers la CVthèque
-- - déduplication par email (1 fiche par candidat, même s'il a postulé N fois)
-- - référence le fichier du bucket 'cvs' (pas de duplication de stockage)
-- - trigger automatique + backfill de l'existant
-- ============================================================

-- 1) Colonnes de provenance
alter table public.cvtheque add column if not exists source text not null default 'upload';   -- 'upload' | 'candidature'
alter table public.cvtheque add column if not exists bucket text not null default 'cvtheque';  -- 'cvtheque' | 'cvs'

-- 2) Déduplication : 1 seule fiche 'candidature' par email
create unique index if not exists cvtheque_candidature_email_uq
  on public.cvtheque (lower(email))
  where source = 'candidature';

-- 3) Trigger : chaque nouvelle candidature alimente la CVthèque (dédupliqué)
create or replace function public.sync_candidature_to_cvtheque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.candidate_email is not null and new.candidate_email <> '' and new.cv_path is not null then
    begin
      insert into public.cvtheque (nom_complet, email, telephone, poste, file_path, file_name, bucket, source)
      select new.candidate_name, new.candidate_email, new.candidate_phone, new.job_title,
             new.cv_path, new.cv_filename, 'cvs', 'candidature'
      where not exists (
        select 1 from public.cvtheque c
        where c.source = 'candidature' and lower(c.email) = lower(new.candidate_email)
      );
    exception when others then
      -- Ne JAMAIS faire échouer une candidature à cause de la CVthèque
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists candidature_to_cvtheque on public.candidatures;
create trigger candidature_to_cvtheque
  after insert on public.candidatures
  for each row execute function public.sync_candidature_to_cvtheque();

-- 4) Backfill de l'existant (1 fiche par email, la candidature la plus récente)
insert into public.cvtheque (nom_complet, email, telephone, poste, file_path, file_name, bucket, source, created_at)
select distinct on (lower(c.candidate_email))
       c.candidate_name, c.candidate_email, c.candidate_phone, c.job_title,
       c.cv_path, c.cv_filename, 'cvs', 'candidature', c.created_at
from public.candidatures c
where c.candidate_email is not null and c.candidate_email <> '' and c.cv_path is not null
  and not exists (
    select 1 from public.cvtheque x
    where x.source = 'candidature' and lower(x.email) = lower(c.candidate_email)
  )
order by lower(c.candidate_email), c.created_at desc;
