-- Verrouillage RLS de `comptes_entreprise`.
--
-- Avant cette migration :
--   ce_select : anon + authenticated, USING (true)
--     -> l'email et le telephone de TOUTES les entreprises etaient lisibles
--        publiquement avec la simple cle anon.
--   ce_insert : anon + authenticated, WITH CHECK (true)
--     -> insertion de lignes arbitraires (n'importe quel id, n'importe quel statut).
--   ce_update : anon + authenticated, USING (true) WITH CHECK (true)
--     -> n'importe qui pouvait passer son compte en statut 'valide' et
--        court-circuiter la moderation, ou ecraser la fiche d'une autre entreprise.
--
-- Apres :
--   - lecture  : sa propre fiche, ou admin ;
--   - creation : uniquement sa propre fiche, forcement en 'en_attente' ;
--   - maj      : sa propre fiche ou admin, mais les champs de moderation
--                (statut, validated_at, notified) et l'identite (id, email) sont
--                proteges par un trigger pour tout ce qui n'est pas admin ;
--   - supp.    : admin uniquement (inchange, migration 005).
--
-- Parcours verifies : inscription entreprise (insert juste apres signUp, donc
-- authentifie), lecture du profil dans l'espace entreprise, liste et moderation
-- cote admin, api/notify-company (JWT admin), api/delete-company (service_role,
-- qui contourne la RLS).
--
-- NB : l'insertion exige une session. Elle en a une car la confirmation d'email
-- Supabase est desactivee (signUp renvoie directement une session). Si
-- « Confirm email » etait reactive, l'inscription casserait.

alter table public.comptes_entreprise enable row level security;

drop policy if exists ce_select on public.comptes_entreprise;
drop policy if exists ce_insert on public.comptes_entreprise;
drop policy if exists ce_update on public.comptes_entreprise;

create policy ce_select on public.comptes_entreprise
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy ce_insert on public.comptes_entreprise
  for insert to authenticated
  with check (id = auth.uid() and statut = 'en_attente');

create policy ce_update on public.comptes_entreprise
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Une policy UPDATE ne sait pas restreindre les COLONNES modifiables : sans ce
-- trigger, une entreprise pourrait se passer elle-meme en 'valide' via sa propre
-- ligne. On restaure donc les champs sensibles a leur valeur precedente pour
-- tout appelant qui n'est ni admin ni service_role.
create or replace function public.ce_protect_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or current_user = 'service_role') then
    new.id           := old.id;
    new.email        := old.email;
    new.statut       := old.statut;
    new.validated_at := old.validated_at;
    new.notified     := old.notified;
  end if;
  return new;
end;
$$;

drop trigger if exists ce_protect_moderation_fields on public.comptes_entreprise;
create trigger ce_protect_moderation_fields
  before update on public.comptes_entreprise
  for each row execute function public.ce_protect_moderation_fields();
