-- Correctif du trigger de la migration 013.
--
-- La condition `current_user = 'service_role'` etait trop etroite : une mise a
-- jour lancee en SQL direct (editeur SQL Supabase, migration, script) s'execute
-- sous le role `postgres`, pas `service_role`. Le trigger annulait donc
-- silencieusement tout changement de `statut` fait en SQL — la requete
-- « reussissait » sans rien modifier, ce qui est particulierement trompeur.
--
-- On se base desormais sur l'absence de contexte utilisateur PostgREST
-- (`auth.uid() is null`), qui couvre le SQL direct comme `service_role`.
-- Un visiteur anonyme ne peut pas en profiter : la policy `ce_update` est
-- reservee au role `authenticated`, il n'atteint jamais le trigger.

create or replace function public.ce_protect_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or auth.uid() is null) then
    new.id           := old.id;
    new.email        := old.email;
    new.statut       := old.statut;
    new.validated_at := old.validated_at;
    new.notified     := old.notified;
  end if;
  return new;
end;
$$;
