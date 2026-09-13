-- ============================================================
-- CVthèque : rattrapage de l'empreinte manquante
--
-- `file_hash` est lu dans `storage.objects` au moment de l'INSERT. Si la ligne
-- de stockage n'y est pas encore (téléversement repris/multipart, écriture SQL
-- directe, import qui insère la fiche avant le fichier), l'empreinte reste
-- NULL — et le critère le plus fiable du garde-fou 029 ne s'applique plus à
-- cette fiche : un second dépôt du même PDF passerait.
--
-- Correctif : toute mise à jour de la fiche recalcule l'empreinte tant qu'elle
-- est absente. Les fiches vivent (analyse différée `parse:cvtheque`, édition
-- admin), donc elles se réparent d'elles-mêmes, sans tâche planifiée.
-- ============================================================

create or replace function public.cvtheque_maj_empreinte()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if new.file_hash is null
     or new.file_path is distinct from old.file_path
     or new.bucket is distinct from old.bucket then
    new.file_hash := public.cvtheque_empreinte(new.bucket, new.file_path);
  end if;
  return new;
end;
$$;

revoke all on function public.cvtheque_maj_empreinte() from public;
revoke all on function public.cvtheque_maj_empreinte() from anon;
revoke all on function public.cvtheque_maj_empreinte() from authenticated;

-- Rattrapage immédiat de l'existant (aucune fiche concernée à ce jour, mais la
-- migration doit être rejouable sur une base restaurée).
update public.cvtheque c
set file_hash = public.cvtheque_empreinte(c.bucket, c.file_path)
where c.file_hash is null;
