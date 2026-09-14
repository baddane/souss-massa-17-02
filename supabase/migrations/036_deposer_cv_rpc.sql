-- ============================================================
-- Depot de CV : une fonction, plus d'ecriture directe en anonyme
--
-- POURQUOI CE CHANGEMENT (la `035` posait une policy INSERT) :
-- le client Supabase envoie `Prefer: return=representation` pour recuperer la
-- ligne creee. PostgREST fait alors `INSERT … RETURNING`, et Postgres applique
-- au RETURNING la politique de **LECTURE**. Un visiteur anonyme n'en a aucune
-- sur `cvtheque` — et ne doit pas en avoir : la CVtheque n'est lisible que
-- depuis l'espace d'une entreprise inscrite et validee. L'insertion etait donc
-- refusee (« new row violates row-level security policy ») alors que la ligne
-- etait parfaitement conforme.
--
-- Deux issues possibles : ouvrir une lecture a l'anonyme — exclu, c'est la
-- regle meme de la CVtheque — ou ne plus ecrire dans la table depuis le
-- navigateur. C'est cette seconde voie.
--
-- Une fonction SECURITY DEFINER est aussi PLUS STRICTE qu'une policy : le
-- formulaire ne choisit plus les colonnes qu'il ecrit. `source`, `bucket`,
-- `visible_recruteurs`, `notes` et `candidat_id` sont poses par la fonction ;
-- l'appelant ne peut plus les soumettre, meme en forgeant sa requete.
-- ============================================================

-- L'ecriture directe n'a plus lieu d'etre : tout passe par la fonction.
drop policy if exists cvtheque_depot_spontane on public.cvtheque;

create or replace function public.deposer_cv(
  p_nom         text,
  p_email       text,
  p_telephone   text,
  p_ville       text,
  p_poste       text,
  p_file_path   text,
  p_file_name   text  default null,
  p_file_type   text  default null,
  p_diplome     text  default null,
  p_niveau      text  default null,
  p_competences text[] default '{}',
  p_langues     text[] default '{}',
  p_keywords    text[] default '{}',
  p_raw_text    text  default null
)
returns text
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_id uuid;
begin
  -- Le chemin borne le depot a son propre prefixe. SANS CE CONTROLE, un
  -- appelant pourrait creer une fiche pointant vers le CV d'un AUTRE candidat
  -- (« MA-10446749/… ») : la policy `cvs_company_read_via_cvtheque` rend
  -- lisible tout fichier de `cvs` rattache a une fiche consentante, ce serait
  -- donc un moyen d'exposer aux entreprises un CV depose hors CVtheque.
  if coalesce(p_file_path, '') !~ '^spontane/[^/]+$' then
    raise exception 'chemin de depot invalide';
  end if;
  if coalesce(btrim(p_nom), '') = '' then
    raise exception 'nom requis';
  end if;
  if btrim(coalesce(p_email, '')) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'adresse e-mail invalide';
  end if;

  insert into public.cvtheque (
    source, bucket, visible_recruteurs, notes, candidat_id,
    file_path, file_name, file_type,
    nom_complet, email, telephone, ville, poste,
    diplome, niveau_etudes, competences, langues, keywords, raw_text)
  values (
    -- Colonnes de controle posees ICI, jamais transmises par le formulaire.
    'spontane', 'cvs', true, null, null,
    p_file_path, left(coalesce(p_file_name, ''), 200), left(coalesce(p_file_type, ''), 100),
    left(btrim(p_nom), 120), lower(btrim(p_email)), left(btrim(coalesce(p_telephone, '')), 30),
    left(btrim(coalesce(p_ville, '')), 80), left(btrim(coalesce(p_poste, '')), 120),
    left(coalesce(p_diplome, ''), 300), left(coalesce(p_niveau, ''), 80),
    coalesce(p_competences, '{}'), coalesce(p_langues, '{}'), coalesce(p_keywords, '{}'),
    left(coalesce(p_raw_text, ''), 20000))
  returning id into v_id;

  -- `v_id` reste NULL quand le garde-fou anti-doublon abandonne la ligne. On le
  -- dit a l'appelant pour qu'il retire le fichier qu'il vient de televerser
  -- pour rien — sans cela, chaque re-depot laisserait un orphelin dans `cvs`.
  -- L'interface affiche le MEME message dans les deux cas : annoncer « vous
  -- etes deja enregistre » a qui saisit l'adresse d'un tiers revelerait la
  -- presence de cette adresse dans la base.
  return case when v_id is null then 'doublon' else 'cree' end;
end;
$$;

-- Appelable par le public : c'est le but. La fonction n'expose RIEN en lecture,
-- elle ne renvoie que « cree » ou « doublon ».
revoke all on function public.deposer_cv(text,text,text,text,text,text,text,text,text,text,text[],text[],text[],text) from public;
grant execute on function public.deposer_cv(text,text,text,text,text,text,text,text,text,text,text[],text[],text[],text) to anon, authenticated;
