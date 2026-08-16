-- Durcissement de la surface des fonctions, suite a l'advisor securite Supabase.
--
-- 1. Fonctions de TRIGGER exposees en RPC
--    Supabase expose toute fonction du schema `public` sur /rest/v1/rpc/. Les
--    fonctions de trigger s'y retrouvaient donc appelables par anon. L'appel
--    direct echoue de toute facon (pas de contexte trigger), mais elles n'ont
--    rien a faire dans la surface publique de l'API.
revoke execute on function public.ce_protect_moderation_fields() from anon, authenticated;
revoke execute on function public.job_offers_company_guard()      from anon, authenticated;
revoke execute on function public.sync_candidature_to_cvtheque()  from anon, authenticated;
revoke execute on function public.cvtheque_search_update()        from anon, authenticated;

-- 2. search_path mutable
--    Sans `search_path` fige, un schema place en tete de recherche peut
--    detourner les objets references par la fonction.
alter function public.generate_slug(text,text,text) set search_path = public;
alter function public.cvtheque_search_update()      set search_path = public;
alter function public.observatoire_market_stats()   set search_path = public;
alter function public.next_observatoire_categorie() set search_path = public;

-- 3. is_validated_company() n'est utilisee que par des policies reservees au
--    role `authenticated` : anon n'a aucune raison de pouvoir l'appeler.
--    NB : `is_admin()` reste appelable en anon — c'est volontaire, la page admin
--    l'interroge, et aucune policy anon ne s'en sert.
revoke execute on function public.is_validated_company() from anon;

-- Verifie apres application : lecture offres 200, contact 201, candidature 201,
-- rpc is_admin 200, lecture observatoire 200, et
-- /rest/v1/rpc/job_offers_company_guard -> 404 PGRST202 (plus expose).
