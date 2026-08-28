-- Les fonctions de trigger ne doivent pas etre appelables via /rest/v1/rpc.
--
-- La migration 018 revoquait deja EXECUTE a `anon` et `authenticated` — sans
-- aucun effet : le droit ne venait pas d'un grant nominatif mais du GRANT
-- implicite que PostgreSQL accorde a PUBLIC sur toute fonction creee. L'advisor
-- Supabase continuait donc (a juste titre) de signaler ces fonctions comme
-- exposees. Il faut revoquer a PUBLIC.
--
-- Un trigger continue de fonctionner apres cette revocation : il s'execute avec
-- les droits du proprietaire de la table, jamais avec ceux de l'appelant.
--
-- `is_admin()`, `is_validated_company()` et `public_marketing_stats()` restent
-- volontairement appelables : les policies et le front s'en servent.

alter function public.candidats_touch_updated_at() set search_path = public;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.candidats_guard()',
    'public.candidats_sync_cvtheque()',
    'public.candidats_touch_updated_at()',
    'public.job_alerts_guard()',
    'public.candidatures_company_guard()',
    'public.ce_protect_moderation_fields()',
    'public.job_offers_company_guard()',
    'public.sync_candidature_to_cvtheque()',
    'public.cvtheque_search_update()'
  ] loop
    begin
      execute format('revoke execute on function %s from public, anon, authenticated', fn);
    exception when undefined_function then
      null;
    end;
  end loop;
end $$;
