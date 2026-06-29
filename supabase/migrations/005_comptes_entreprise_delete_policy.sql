-- Permet aux admins de supprimer une entreprise inscrite, quel que soit son statut
-- (y compris les entreprises déjà validées). Sans cette policy, RLS bloque tout DELETE.

drop policy if exists ce_delete on public.comptes_entreprise;
create policy ce_delete
  on public.comptes_entreprise
  for delete
  to authenticated
  using (public.is_admin());
