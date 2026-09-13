-- ============================================================
-- CVthèque : search_path figé sur les deux fonctions utilitaires de la 029
--
-- Relevé par l'advisor Supabase (`function_search_path_mutable`) juste après
-- l'application de la 029. Sans `set search_path`, la résolution de
-- `public.unaccent` dépend du search_path de l'appelant : un rôle qui place un
-- schéma à lui devant `public` ferait exécuter SA fonction `unaccent` à
-- l'intérieur du garde-fou anti-doublon.
--
-- La 029 a été corrigée dans le dépôt : rejouée depuis zéro, elle crée déjà
-- les fonctions ainsi. Cette migration met à niveau les bases où la 029 est
-- déjà passée. Les deux corps sont identiques à ceux de la 029.
-- ============================================================

create or replace function public.cvtheque_tel9(p text)
returns text language sql immutable
set search_path = public as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9), '');
$$;

create or replace function public.cvtheque_nom_cle(p text)
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

do $$
declare f text;
begin
  foreach f in array array['public.cvtheque_tel9(text)', 'public.cvtheque_nom_cle(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('revoke all on function %s from authenticated', f);
  end loop;
end $$;
