-- ============================================================
-- Espace candidat : compte, profil, consentement CVthèque, alertes
-- ============================================================
--
-- Jusqu'ici la plateforme n'avait qu'un seul cote : le recruteur. Le candidat
-- postulait puis disparaissait — aucun compte, aucun suivi, et surtout aucun
-- controle sur la presence de son CV dans la CVtheque consultee par les
-- entreprises. Cette migration cree l'autre moitie de l'intermediation.
--
-- REGLE DE NON-REGRESSION : `visible_recruteurs` vaut `true` par defaut. Les 96
-- fiches deja presentes gardent donc exactement le comportement actuel ; seul un
-- candidat qui cree un compte peut desormais se retirer.

-- ---------------------------------------------------------------------------
-- 1. Profil candidat (id = auth.users.id, comme comptes_entreprise)
-- ---------------------------------------------------------------------------
create table if not exists public.candidats (
  id                 uuid primary key references auth.users(id) on delete cascade,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  email              text not null,
  nom_complet        text not null,
  telephone          text,
  ville              text,
  quartier           text,
  poste_recherche    text,
  niveau_etudes      text,
  diplome            text,
  competences        text[] not null default '{}',
  langues            text[] not null default '{}',
  experience_years   numeric,
  disponibilite      text,
  contrats_souhaites text[] not null default '{}',
  villes_souhaitees  text[] not null default '{}',
  cv_path            text,
  cv_filename        text,
  -- Consentement explicite : « je rends mon profil visible aux recruteurs ».
  visible_recruteurs boolean not null default true,
  -- Le candidat en poste peut se mettre en pause sans supprimer son compte.
  actif              boolean not null default true
);

create index if not exists candidats_email_idx on public.candidats (lower(email));

create or replace function public.candidats_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists candidats_touch on public.candidats;
create trigger candidats_touch before update on public.candidats
  for each row execute function public.candidats_touch_updated_at();

alter table public.candidats enable row level security;

-- Un compte admin ne doit jamais porter de fiche candidat : c'est exactement le
-- piege qui a greffe une fiche entreprise sur le compte admin (migration 019).
drop policy if exists candidats_self_insert on public.candidats;
create policy candidats_self_insert on public.candidats
  for insert to authenticated
  with check (id = auth.uid() and not public.is_admin());

drop policy if exists candidats_self_select on public.candidats;
create policy candidats_self_select on public.candidats
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists candidats_self_update on public.candidats;
create policy candidats_self_update on public.candidats
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists candidats_admin_delete on public.candidats;
create policy candidats_admin_delete on public.candidats
  for delete to authenticated
  using (id = auth.uid() or public.is_admin());

-- Une policy ne restreint pas les colonnes : sans ce garde-fou, un candidat
-- pourrait reecrire son `id` ou son `email` et prendre la main sur les fiches
-- CVtheque d'un autre (la synchronisation se fait par email).
create or replace function public.candidats_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  new.id         := old.id;
  new.email      := old.email;
  new.created_at := old.created_at;
  return new;
end;
$$;

revoke execute on function public.candidats_guard() from anon, authenticated;

drop trigger if exists candidats_guard on public.candidats;
create trigger candidats_guard before update on public.candidats
  for each row execute function public.candidats_guard();

-- ---------------------------------------------------------------------------
-- 2. Consentement sur la CVthèque
-- ---------------------------------------------------------------------------
alter table public.cvtheque
  add column if not exists visible_recruteurs boolean not null default true;

alter table public.cvtheque
  add column if not exists candidat_id uuid references public.candidats(id) on delete set null;

-- Les entreprises ne voient plus que les profils consentants. L'admin garde la
-- vue complete via `cvtheque_admin_all` (migration 006).
drop policy if exists cvtheque_company_select on public.cvtheque;
create policy cvtheque_company_select on public.cvtheque
  for select to authenticated
  using (public.is_validated_company() and coalesce(visible_recruteurs, true));

-- Meme regle cote stockage : un profil retire ne doit plus etre telechargeable.
drop policy if exists cvs_company_read_via_cvtheque on storage.objects;
create policy cvs_company_read_via_cvtheque on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and public.is_validated_company()
    and exists (
      select 1 from public.cvtheque c
      where c.bucket = 'cvs'
        and c.file_path = storage.objects.name
        and coalesce(c.visible_recruteurs, true)
    )
  );

drop policy if exists cvtheque_company_read on storage.objects;
create policy cvtheque_company_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvtheque'
    and public.is_validated_company()
    and exists (
      select 1 from public.cvtheque c
      where c.bucket = 'cvtheque'
        and c.file_path = storage.objects.name
        and coalesce(c.visible_recruteurs, true)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Le candidat ne touche JAMAIS la CVthèque directement
-- ---------------------------------------------------------------------------
-- Il edite `candidats` ; un trigger SECURITY DEFINER repercute sur ses fiches
-- CVtheque. Ecrire l'inverse (ouvrir cvtheque en ecriture aux authentifies)
-- aurait expose une table de donnees personnelles a tous les comptes.
--
-- La repercussion vise TOUTES les fiches portant son email, pas seulement une :
-- si le candidat se retire, il doit disparaitre partout, pas a moitie.
create or replace function public.candidats_sync_cvtheque()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  touched int;
begin
  update public.cvtheque c set
    candidat_id        = new.id,
    nom_complet        = coalesce(nullif(new.nom_complet, ''), c.nom_complet),
    telephone          = coalesce(nullif(new.telephone, ''), c.telephone),
    ville              = coalesce(nullif(new.ville, ''), c.ville),
    quartier           = coalesce(nullif(new.quartier, ''), c.quartier),
    poste              = coalesce(nullif(new.poste_recherche, ''), c.poste),
    diplome            = coalesce(nullif(new.diplome, ''), c.diplome),
    niveau_etudes      = coalesce(nullif(new.niveau_etudes, ''), c.niveau_etudes),
    competences        = case when array_length(new.competences, 1) is null then c.competences else new.competences end,
    langues            = case when array_length(new.langues, 1) is null then c.langues else new.langues end,
    experience_years   = coalesce(new.experience_years, c.experience_years),
    file_path          = coalesce(nullif(new.cv_path, ''), c.file_path),
    file_name          = coalesce(nullif(new.cv_filename, ''), c.file_name),
    -- Un compte mis en pause se retire aussi de la CVtheque.
    visible_recruteurs = (new.visible_recruteurs and new.actif)
  where lower(c.email) = lower(new.email);

  get diagnostics touched = row_count;

  -- Aucune fiche existante : le candidat n'avait jamais postule. On n'en cree
  -- une que s'il a effectivement depose un CV, sinon la CVtheque se remplirait
  -- de fiches sans document.
  if touched = 0 and new.cv_path is not null and new.cv_path <> '' then
    insert into public.cvtheque (
      candidat_id, nom_complet, email, telephone, ville, quartier, poste,
      diplome, niveau_etudes, competences, langues, experience_years,
      file_path, file_name, bucket, source, visible_recruteurs
    ) values (
      new.id, new.nom_complet, new.email, new.telephone, new.ville, new.quartier,
      new.poste_recherche, new.diplome, new.niveau_etudes, new.competences,
      new.langues, new.experience_years, new.cv_path, new.cv_filename,
      'cvs', 'candidat', (new.visible_recruteurs and new.actif)
    );
  end if;

  return new;
exception when others then
  -- La CVtheque ne doit jamais faire echouer l'enregistrement d'un profil.
  return new;
end;
$$;

revoke execute on function public.candidats_sync_cvtheque() from anon, authenticated;

drop trigger if exists candidats_sync_cvtheque on public.candidats;
create trigger candidats_sync_cvtheque
  after insert or update on public.candidats
  for each row execute function public.candidats_sync_cvtheque();

-- ---------------------------------------------------------------------------
-- 4. Le candidat retrouve ses candidatures
-- ---------------------------------------------------------------------------
-- Le rapprochement se fait par email : un candidat qui cree son compte avec
-- l'adresse utilisee pour postuler retrouve immediatement tout son historique,
-- y compris les candidatures anterieures a la creation du compte.
drop policy if exists cand_self_select on public.candidatures;
create policy cand_self_select on public.candidatures
  for select to authenticated
  using (lower(candidate_email) = lower(auth.jwt() ->> 'email'));

-- ... et telecharge son propre CV (bucket prive).
drop policy if exists cvs_self_read on storage.objects;
create policy cvs_self_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and (
      storage.objects.name like 'candidat/' || auth.uid()::text || '/%'
      or exists (
        select 1 from public.candidatures c
        where c.cv_path = storage.objects.name
          and lower(c.candidate_email) = lower(auth.jwt() ->> 'email')
      )
    )
  );

-- Depot du CV depuis l'espace candidat, cantonne a son propre dossier.
drop policy if exists cvs_self_write on storage.objects;
create policy cvs_self_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cvs'
    and storage.objects.name like 'candidat/' || auth.uid()::text || '/%'
  );

drop policy if exists cvs_self_delete on storage.objects;
create policy cvs_self_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cvs'
    and storage.objects.name like 'candidat/' || auth.uid()::text || '/%'
  );

-- ---------------------------------------------------------------------------
-- 5. Alertes emploi
-- ---------------------------------------------------------------------------
create table if not exists public.job_alerts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  candidat_id   uuid not null references public.candidats(id) on delete cascade,
  email         text not null,
  intitule      text,
  ville         text,
  type_contrat  text,
  frequence     text not null default 'quotidienne'
                check (frequence in ('quotidienne', 'hebdomadaire')),
  actif         boolean not null default true,
  last_sent_at  timestamptz
);

create index if not exists job_alerts_actif_idx on public.job_alerts (actif, frequence);

alter table public.job_alerts enable row level security;

drop policy if exists job_alerts_self on public.job_alerts;
create policy job_alerts_self on public.job_alerts
  for all to authenticated
  using (candidat_id = auth.uid() or public.is_admin())
  with check (candidat_id = auth.uid() or public.is_admin());

-- L'email de l'alerte est celui du compte, jamais une adresse saisie : sinon
-- n'importe qui pourrait faire envoyer des emails a un tiers via la plateforme.
create or replace function public.job_alerts_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  select c.email into new.email from public.candidats c where c.id = new.candidat_id;
  if new.email is null then
    raise exception 'Profil candidat introuvable';
  end if;
  if tg_op = 'UPDATE' then
    new.id          := old.id;
    new.candidat_id := old.candidat_id;
    new.created_at  := old.created_at;
    new.last_sent_at := old.last_sent_at;
  end if;
  return new;
end;
$$;

revoke execute on function public.job_alerts_guard() from anon, authenticated;

drop trigger if exists job_alerts_guard on public.job_alerts;
create trigger job_alerts_guard before insert or update on public.job_alerts
  for each row execute function public.job_alerts_guard();
