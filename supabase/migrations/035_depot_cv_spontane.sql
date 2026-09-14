-- ============================================================
-- Depot de CV spontane (page publique /deposer-mon-cv)
--
-- POURQUOI : depuis la fermeture des inscriptions candidat, il n'existait
-- AUCUN moyen de deposer un CV sans postuler a une offre precise — le bouton
-- « Deposer mon CV » du menu renvoyait vers /offres. Constat du 2026-09-14 :
-- les candidatures montent (72/semaine) mais les NOUVELLES personnes baissent
-- (24 par semaine debut aout, 8 la semaine derniere). Les memes 118 personnes
-- postulent 3,5 fois chacune. Le goulot est l'acquisition, pas l'engagement.
--
-- Le depot spontane ecrit directement dans `cvtheque`, sans passer par
-- `candidatures` : un CV depose hors offre n'est pas une candidature, et
-- l'inscrire comme telle fausserait le compteur de candidatures des offres et
-- le tableau de bord des entreprises.
-- ============================================================

-- 1) Ecriture anonyme, strictement bornee -----------------------------------
-- Le modele est deja celui de `candidatures` et `messages` : ecriture seule
-- pour le public, lecture reservee. Aucune donnee n'est exposee — il n'y a pas
-- de SELECT ici.
drop policy if exists cvtheque_depot_spontane on public.cvtheque;
create policy cvtheque_depot_spontane on public.cvtheque
  for insert to anon, authenticated
  with check (
    -- Confine le depot a son propre prefixe. SANS CES TROIS LIGNES, un
    -- appelant anonyme pourrait creer une fiche pointant vers le CV d'un
    -- AUTRE candidat (`MA-10446749/…`) : la policy `cvs_company_read_via_cvtheque`
    -- rend lisible tout fichier de `cvs` rattache a une fiche consentante, donc
    -- ce serait un moyen d'exposer aux entreprises un CV depose hors CVtheque.
        source = 'spontane'
    and bucket = 'cvs'
    and file_path like 'spontane/%'
    -- Le consentement EST le service rendu ici : sans lui, il n'y a rien a
    -- deposer. Le formulaire l'exige explicitement.
    and visible_recruteurs = true
    -- De quoi rappeler la personne, sinon la fiche ne sert a aucun recruteur.
    and coalesce(btrim(nom_complet), '') <> ''
    and btrim(coalesce(email, '')) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    -- `notes` est le champ de travail de l'admin, `candidat_id` un rattachement
    -- de compte : ni l'un ni l'autre ne se saisit depuis un formulaire public.
    and notes is null
    and candidat_id is null
  );

-- 2) Un depot spontane ne modifie JAMAIS une fiche existante ------------------
-- Le garde-fou anti-doublon (`029`) comble les champs vides de la fiche
-- trouvee. Utile pour une candidature — dangereux ici : l'appelant n'est pas
-- authentifie, et pourrait deposer sous l'e-mail d'un tiers pour glisser SON
-- numero de telephone dans la fiche de cette personne, dont un recruteur se
-- servirait ensuite. Un doublon spontane est donc simplement abandonne.
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
    (new.file_hash is not null and c.file_hash = new.file_hash)
    or (coalesce(btrim(new.email), '') <> '' and lower(btrim(c.email)) = lower(btrim(new.email)))
    or (v_tel9 is not null and v_nom is not null and length(v_nom) >= 5
        and public.cvtheque_tel9(c.telephone) = v_tel9
        and public.cvtheque_nom_cle(c.nom_complet) = v_nom)
  order by c.created_at
  limit 1;

  if not found then
    return new;
  end if;

  -- Depot public : on abandonne sans rien ecrire dans la fiche existante.
  if new.source = 'spontane' then
    return null;
  end if;

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
    visible_recruteurs = c.visible_recruteurs and coalesce(new.visible_recruteurs, true)
  where c.id = v_existant.id;

  return null;
end;
$$;

revoke all on function public.cvtheque_anti_doublon() from public;
revoke all on function public.cvtheque_anti_doublon() from anon;
revoke all on function public.cvtheque_anti_doublon() from authenticated;
