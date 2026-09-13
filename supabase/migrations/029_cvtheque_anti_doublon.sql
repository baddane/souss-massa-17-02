-- ============================================================
-- CVthèque : aucune fiche en double, quel que soit le chemin d'écriture
--
-- Le garde-fou existant (migration 007) dédoublonnait sur `lower(email)` et
-- UNIQUEMENT parmi les fiches `source='candidature'`. Deux trous :
--   1. une faute de frappe dans l'adresse (gmail/gamail, aherbil/ahernil)
--      créait une seconde fiche pour la même personne et le même fichier ;
--   2. un import admin (`source='upload'`) n'était comparé à rien.
-- Constat du 2026-09-13 : 4 personnes présentes deux fois, à chaque fois avec
-- un PDF rigoureusement identique. Une CVthèque qui montre deux fois le même
-- candidat fait perdre son temps au recruteur et fausse le volume annoncé
-- pendant la campagne d'invitation.
--
-- Le critère retenu est l'empreinte du FICHIER (MD5 fourni par le stockage),
-- et non le texte analysé : elle fonctionne aussi pour les CV scannés, dont
-- `raw_text` est vide. Deux personnes différentes ne peuvent pas déposer un
-- PDF octet pour octet identique.
-- ============================================================

-- 1) Empreinte du fichier, portée par la fiche -----------------------------
alter table public.cvtheque add column if not exists file_hash text;

-- Lecture de l'empreinte dans le stockage. SECURITY DEFINER : `storage.objects`
-- est sous RLS, et l'insertion peut venir d'une candidature déposée en anon.
create or replace function public.cvtheque_empreinte(p_bucket text, p_path text)
returns text
language sql
security definer
stable
set search_path = public, storage
as $$
  select btrim(o.metadata->>'eTag', '"')
  from storage.objects o
  where o.name = p_path and o.bucket_id = coalesce(p_bucket, 'cvtheque')
  limit 1;
$$;

update public.cvtheque c
set file_hash = public.cvtheque_empreinte(c.bucket, c.file_path)
where c.file_hash is null;

-- 2) Normalisations servant à reconnaître une même personne ----------------
-- Téléphone : les 9 derniers chiffres (0612..., +212612..., 06 12 ... se valent).
create or replace function public.cvtheque_tel9(p text)
returns text language sql immutable
set search_path = public as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9), '');
$$;

-- Nom : sans accents, sans ponctuation, mots triés — « Elorch Widad » et
-- « Widad Elorch » désignent la même personne.
create or replace function public.cvtheque_nom_cle(p text)
-- STABLE et non IMMUTABLE : public.unaccent() est STABLE (elle lit son
-- dictionnaire). La declarer immutable serait mentir au planificateur.
returns text language sql stable
set search_path = public as $$
  select nullif((
    select string_agg(m, ' ' order by m)
    from unnest(regexp_split_to_array(
           btrim(regexp_replace(lower(public.unaccent(coalesce(p, ''))), '[^a-z ]', ' ', 'g')),
           '\s+')) m
    where m <> ''
  ), '');
$$;

-- 3) Le garde-fou : BEFORE INSERT sur la table elle-même -------------------
-- Posé sur `cvtheque` et non dans le service ou dans le trigger des
-- candidatures : c'est le seul endroit que TOUS les chemins traversent
-- (candidature anonyme, import admin, SQL direct, service_role).
create or replace function public.cvtheque_anti_doublon()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_existant public.cvtheque%rowtype;
  v_tel9 text;
  v_nom  text;
begin
  if new.file_hash is null then
    new.file_hash := public.cvtheque_empreinte(new.bucket, new.file_path);
  end if;

  v_tel9 := public.cvtheque_tel9(new.telephone);
  v_nom  := public.cvtheque_nom_cle(new.nom_complet);

  select * into v_existant
  from public.cvtheque c
  where
    -- (a) fichier rigoureusement identique
    (new.file_hash is not null and c.file_hash = new.file_hash)
    -- (b) même adresse
    or (coalesce(btrim(new.email), '') <> '' and lower(btrim(c.email)) = lower(btrim(new.email)))
    -- (c) même téléphone ET même nom : couvre le CV mis à jour (fichier
    --     différent) déposé avec une adresse mal saisie. Les deux réunis, car
    --     un numéro partagé (famille, cyber) ne suffit pas à conclure.
    or (v_tel9 is not null and v_nom is not null and length(v_nom) >= 5
        and public.cvtheque_tel9(c.telephone) = v_tel9
        and public.cvtheque_nom_cle(c.nom_complet) = v_nom)
  order by c.created_at
  limit 1;

  if not found then
    return new;
  end if;

  -- Fiche déjà présente : on ne la remplace pas, on comble seulement ce
  -- qu'elle n'a pas. Écraser une valeur corrigée à la main par l'admin avec
  -- une extraction automatique serait une régression silencieuse.
  update public.cvtheque c set
    nom_complet       = coalesce(nullif(btrim(c.nom_complet), ''), new.nom_complet),
    telephone         = coalesce(nullif(btrim(c.telephone), ''),   new.telephone),
    ville             = coalesce(nullif(btrim(c.ville), ''),       new.ville),
    quartier          = coalesce(nullif(btrim(c.quartier), ''),    new.quartier),
    poste             = coalesce(nullif(btrim(c.poste), ''),       new.poste),
    diplome           = coalesce(nullif(btrim(c.diplome), ''),     new.diplome),
    niveau_etudes     = coalesce(nullif(btrim(c.niveau_etudes), ''), new.niveau_etudes),
    competences       = case when coalesce(array_length(c.competences, 1), 0) = 0 then new.competences else c.competences end,
    langues           = case when coalesce(array_length(c.langues, 1), 0) = 0 then new.langues else c.langues end,
    keywords          = case when coalesce(array_length(c.keywords, 1), 0) = 0 then new.keywords else c.keywords end,
    experience_years  = coalesce(c.experience_years, new.experience_years),
    experience_resume = coalesce(nullif(btrim(c.experience_resume), ''), new.experience_resume),
    raw_text          = coalesce(nullif(btrim(c.raw_text), ''), new.raw_text),
    file_hash         = coalesce(c.file_hash, new.file_hash),
    -- Le consentement ne s'élargit JAMAIS par fusion : un profil retiré de la
    -- CVthèque ne doit pas y revenir parce qu'une candidature est arrivée.
    visible_recruteurs = c.visible_recruteurs and coalesce(new.visible_recruteurs, true)
  where c.id = v_existant.id;

  -- On abandonne la ligne : la CVthèque ne gagne pas de doublon, et
  -- l'appelant (candidature) n'échoue pas pour autant.
  return null;
end;
$$;

drop trigger if exists cvtheque_anti_doublon on public.cvtheque;
create trigger cvtheque_anti_doublon
  before insert on public.cvtheque
  for each row execute function public.cvtheque_anti_doublon();

-- Le fichier change (remplacement d'un CV) : l'empreinte doit suivre, sinon
-- le garde-fou comparerait des empreintes périmées.
create or replace function public.cvtheque_maj_empreinte()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if new.file_path is distinct from old.file_path or new.bucket is distinct from old.bucket then
    new.file_hash := public.cvtheque_empreinte(new.bucket, new.file_path);
  end if;
  return new;
end;
$$;

drop trigger if exists cvtheque_maj_empreinte on public.cvtheque;
create trigger cvtheque_maj_empreinte
  before update on public.cvtheque
  for each row execute function public.cvtheque_maj_empreinte();

-- 4) Filet de sécurité en base --------------------------------------------
-- Le trigger peut être contourné (ALTER TABLE ... DISABLE TRIGGER, restauration) ;
-- l'index unique, lui, ne peut pas l'être.
drop index if exists public.cvtheque_candidature_email_uq;   -- ne couvrait que source='candidature'

create unique index if not exists cvtheque_email_uq
  on public.cvtheque (lower(btrim(email)))
  where email is not null and btrim(email) <> '';

create unique index if not exists cvtheque_file_hash_uq
  on public.cvtheque (file_hash)
  where file_hash is not null;

-- 5) Fonctions non appelables depuis l'API REST ----------------------------
-- Sur une fonction NOUVELLE, Supabase pose des GRANT nominatifs à `anon` et
-- `authenticated` : révoquer à `public` seul ne retire rien et l'advisor
-- continue de signaler la fonction (cf. migrations 018 / 023 / 027).
do $$
declare f text;
begin
  foreach f in array array[
    'public.cvtheque_empreinte(text, text)',
    'public.cvtheque_tel9(text)',
    'public.cvtheque_nom_cle(text)',
    'public.cvtheque_anti_doublon()',
    'public.cvtheque_maj_empreinte()'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('revoke all on function %s from authenticated', f);
  end loop;
end $$;
