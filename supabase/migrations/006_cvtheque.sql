-- ============================================================
-- CVthèque admin : bucket privé séparé + table + recherche FR
-- (parsing 100% côté client, sans LLM)
-- ============================================================

-- 1) Bucket privé, distinct de 'cvs' (candidats)
insert into storage.buckets (id, name, public)
values ('cvtheque', 'cvtheque', false)
on conflict (id) do nothing;

-- 2) Table de classement / recherche
create table if not exists public.cvtheque (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  file_path         text not null,
  file_name         text,
  file_type         text,
  nom_complet       text,
  email             text,
  telephone         text,
  ville             text,
  quartier          text,
  poste             text,
  diplome           text,
  niveau_etudes     text,
  competences       text[] default '{}',
  langues           text[] default '{}',
  experience_years  numeric,
  experience_resume text,
  keywords          text[] default '{}',
  raw_text          text,
  notes             text,
  search_tsv        tsvector
);

-- Recherche plein-texte FR via trigger
-- (colonne générée impossible : le cast 'french'::regconfig n'est pas immutable)
create or replace function public.cvtheque_search_update() returns trigger
language plpgsql as $$
begin
  new.search_tsv :=
    to_tsvector('french',
      coalesce(new.nom_complet,'')       || ' ' ||
      coalesce(new.poste,'')             || ' ' ||
      coalesce(new.diplome,'')           || ' ' ||
      coalesce(new.niveau_etudes,'')     || ' ' ||
      coalesce(new.ville,'')             || ' ' ||
      coalesce(new.quartier,'')          || ' ' ||
      coalesce(array_to_string(new.competences,' '),'') || ' ' ||
      coalesce(array_to_string(new.langues,' '),'')     || ' ' ||
      coalesce(array_to_string(new.keywords,' '),'')    || ' ' ||
      coalesce(new.experience_resume,'') || ' ' ||
      coalesce(new.raw_text,'')
    );
  return new;
end;
$$;

drop trigger if exists cvtheque_search_trg on public.cvtheque;
create trigger cvtheque_search_trg
  before insert or update on public.cvtheque
  for each row execute function public.cvtheque_search_update();

create index if not exists cvtheque_search_idx  on public.cvtheque using gin (search_tsv);
create index if not exists cvtheque_ville_idx    on public.cvtheque (ville);
create index if not exists cvtheque_poste_idx    on public.cvtheque (poste);
create index if not exists cvtheque_created_idx  on public.cvtheque (created_at desc);

-- 3) RLS : réservé aux admins (données personnelles)
alter table public.cvtheque enable row level security;
drop policy if exists cvtheque_admin_all on public.cvtheque;
create policy cvtheque_admin_all
  on public.cvtheque for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 4) Storage policies bucket 'cvtheque' : admin only
drop policy if exists cvtheque_obj_select on storage.objects;
create policy cvtheque_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'cvtheque' and public.is_admin());

drop policy if exists cvtheque_obj_insert on storage.objects;
create policy cvtheque_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvtheque' and public.is_admin());

drop policy if exists cvtheque_obj_delete on storage.objects;
create policy cvtheque_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvtheque' and public.is_admin());
