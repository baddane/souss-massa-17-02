-- Statistiques agrégées du marché de l'emploi (offres actives) pour le baromètre mensuel.
-- La routine appelle cette fonction (clé anon) et obtient des chiffres cohérents et
-- reproductibles : volumes, contrats, villes, secteurs (offres+postes), compétences,
-- fourchettes salariales, évolution mensuelle. Classification sectorielle par mots-clés
-- sur l'intitulé de poste (alignée sur les secteurs du site).
create or replace function public.observatoire_market_stats()
returns jsonb
language sql
stable
as $$
  with base as (
    select emploi_metier, ville, type_contrat, required_skills, nbre_postes, date_offre,
           suggested_salary_range, raison_sociale,
      case
        when emploi_metier ilike any(array['%sécurit%','%securit%','%surveillance%','%gardien%']) then 'Sécurité & gardiennage'
        when emploi_metier ilike any(array['%cuisin%','%serveur%','%barman%','%chef de partie%','%commis%','%réception%','%reception%','%restaurat%','%menage%','%ménage%','%étage%','%poissonn%','%hôtel%','%hotel%']) or raison_sociale ilike any(array['%hotel%','%hôtel%','%balnea%','%resort%','%riad%']) then 'Tourisme & Hôtellerie'
        when emploi_metier ilike any(array['%infirm%','%soignant%','%pharmac%','%esthétic%','%esthetic%','%kiné%','%médic%','%medic%','%dentaire%']) then 'Santé'
        when emploi_metier ilike any(array['%développeur%','%developpeur%','%informat%','%teleconseil%','%téléconseil%','%data%','%digital%','%web%','%systeme%','%système%']) then 'Informatique & IT'
        when emploi_metier ilike any(array['%bâtiment%','%batiment%','%dessinateur%','%électricien%','%electricien%','%conducteur de travaux%','%génie civil%','%genie civil%','%chantier%','%btp%','%topograph%','%plomb%','%soudeur%','%maçon%','%macon%']) then 'BTP & Construction'
        when emploi_metier ilike any(array['%commercial%','%vendeur%','%vente%','%caissier%','%représentant%','%representant%','%téléven%','%televen%','%marketing%','%clientèle%','%clientele%','%business%','%portefeuille%','%agence%']) then 'Commerce & Vente'
        when emploi_metier ilike any(array['%comptab%','%secrétaire%','%secretaire%','%administrat%','%assistant%','%banque%','%financ%','%ressources humaines%','%gestionnaire%','%gestion%','%contrôle%','%controle%','%bureau%','%accueil%','%facturation%','%souscript%']) then 'Administration & Finance'
        when emploi_metier ilike any(array['%opérateur%','%operateur%','%production%','%maintenance%','%mécanic%','%mecanic%','%magasin%','%cariste%','%livreur%','%chauffeur%','%conducteur%','%contrôleur%','%controleur%','%agricole%','%aquacult%','%usine%','%logistique%','%manutention%','%technicien%','%industri%','%préparateur%','%preparateur%']) then 'Industrie & Logistique'
        when emploi_metier ilike any(array['%formateur%','%enseignant%','%professeur%','%éducat%','%educat%']) then 'Éducation & Formation'
        else 'Autres services'
      end as secteur
    from public.job_offers where statut = 'active'
  ),
  sal as (
    select case
      when low < 3000 then '< 3 000'  when low < 4000 then '3 000-3 999'
      when low < 6000 then '4 000-5 999' when low < 8000 then '6 000-7 999'
      when low < 12000 then '8 000-11 999' else '12 000 +' end as tranche,
      case when low < 3000 then 1 when low<4000 then 2 when low<6000 then 3 when low<8000 then 4 when low<12000 then 5 else 6 end as ord
    from (
      select nullif(regexp_replace(split_part(suggested_salary_range,'-',1),'[^0-9]','','g'),'')::int as low
      from base where suggested_salary_range is not null and suggested_salary_range <> ''
    ) x where low between 1500 and 60000
  )
  select jsonb_build_object(
    'generated_at', to_char(now(),'YYYY-MM-DD'),
    'total_offres', (select count(*) from base),
    'total_postes', (select coalesce(sum(nbre_postes),0) from base),
    'nb_entreprises', (select count(distinct raison_sociale) from base),
    'nb_villes', (select count(distinct ville) from base),
    'periode_min', (select min(date_offre) from base),
    'periode_max', (select max(date_offre) from base),
    'contrats', (select jsonb_agg(jsonb_build_object('k', coalesce(type_contrat,'Non précisé'),'n',n) order by n desc) from (select type_contrat, count(*) n from base group by type_contrat) t),
    'villes', (select jsonb_agg(jsonb_build_object('k', coalesce(ville,'Non précisé'),'n',n,'postes',p) order by n desc) from (select ville, count(*) n, sum(nbre_postes) p from base group by ville) t),
    'secteurs', (select jsonb_agg(jsonb_build_object('k',secteur,'offres',n,'postes',p) order by n desc) from (select secteur, count(*) n, sum(nbre_postes) p from base group by secteur) t),
    'competences', (select jsonb_agg(jsonb_build_object('k',k,'n',n) order by n desc) from (select lower(trim(s)) k, count(*) n from base, unnest(required_skills) s where trim(s)<>'' group by 1 order by 2 desc limit 12) t),
    'salaires', (select jsonb_agg(jsonb_build_object('k',tranche,'n',n) order by ord) from (select tranche, ord, count(*) n from sal group by tranche, ord) t),
    'mois', (select jsonb_agg(jsonb_build_object('k',m,'n',n) order by m) from (select to_char(to_date(date_offre,'YYYY-MM-DD'),'YYYY-MM') m, count(*) n from base group by 1) t)
  );
$$;

grant execute on function public.observatoire_market_stats() to anon, authenticated;
