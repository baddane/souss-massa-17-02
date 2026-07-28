import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SEO, { slugify } from '../components/SEO';
import { jobOffersService, JobOffer } from '../services/jobOffersService';
import { SOUSS_MASSA_CITIES } from '../constants';
import RecruiterCTA from '../components/RecruiterCTA';

const SITE_URL = 'https://www.soussmassa-rh.com';

const SECTORS = [
  { value: 'informatique', label: 'Informatique' },
  { value: 'commercial', label: 'Commerce' },
  { value: 'administratif', label: 'Administration' },
  { value: 'industrie', label: 'Industrie' },
  { value: 'sante', label: 'Santé' },
  { value: 'tourisme', label: 'Tourisme' },
  { value: 'construction', label: 'BTP' },
];

const CityJobs: React.FC = () => {
  const { ville } = useParams<{ ville: string }>();
  const [offers, setOffers] = useState<JobOffer[] | null>(null);

  useEffect(() => {
    let alive = true;
    jobOffersService.getAllJobOffers()
      .then((all) => { if (alive) setOffers(all.filter((o) => slugify(o.ville || '') === ville)); })
      .catch(() => { if (alive) setOffers([]); });
    return () => { alive = false; };
  }, [ville]);

  // Nom d'affichage de la ville (depuis les offres, sinon depuis la liste régionale)
  const cityName = (offers && offers[0]?.ville) || SOUSS_MASSA_CITIES.find((c) => slugify(c) === ville);
  if (offers !== null && !cityName) return <Navigate to="/offres" replace />;

  if (offers === null) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  }

  const totalPostes = offers.reduce((s, o) => s + (Number(o.nbre_postes) || 1), 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Offres d'emploi à ${cityName}`,
    itemListElement: offers.slice(0, 30).map((o, i) => ({
      '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/emploi/${o.slug}`, name: o.emploi_metier,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <SEO
        title={`Emploi à ${cityName} : offres d'emploi et recrutement`}
        description={`Toutes les offres d'emploi à ${cityName} (Souss-Massa) : ${offers.length} annonce${offers.length > 1 ? 's' : ''} en CDI, CDD, stage et intérim. Jobs in ${cityName}. Postulez gratuitement en ligne.`}
        canonical={`/offres/${ville}`}
        jsonLd={jsonLd}
      />

      <nav className="text-sm text-gray-400 mb-4">
        <Link to="/offres" className="hover:text-blue-600">Offres d'emploi</Link>
        <span className="mx-2">/</span>
        <span>{cityName}</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Offres d'emploi à {cityName}</h1>
      <p className="text-gray-600 mb-6">
        {offers.length > 0
          ? <>Découvrez <strong>{offers.length} offre{offers.length > 1 ? 's' : ''} d'emploi</strong> à {cityName} ({totalPostes} poste{totalPostes > 1 ? 's' : ''} à pourvoir) dans la région Souss-Massa : CDI, CDD, stage, intérim. Recrutement à {cityName} — postulez en ligne gratuitement.</>
          : <>Aucune offre d'emploi active à {cityName} pour le moment. Consultez toutes les <Link to="/offres" className="text-blue-600 hover:underline">offres de la région Souss-Massa</Link> ou revenez bientôt.</>}
      </p>

      {/* Secteurs à cette ville */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SECTORS.map((s) => (
          <Link key={s.value} to={`/offres?sector=${s.value}&city=${encodeURIComponent(cityName!)}`}
            className="px-3 py-1.5 rounded-full text-sm bg-white border border-gray-200 text-gray-600 hover:border-blue-300">
            {s.label} à {cityName}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {offers.map((o) => (
          <Link key={o.id} to={`/emploi/${o.slug}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{o.emploi_metier}</h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                  <span>{o.raison_sociale}</span>
                  {o.type_contrat && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">{o.type_contrat}</span>}
                  {o.nbre_postes > 1 && <span>{o.nbre_postes} postes</span>}
                </div>
              </div>
              <span className="text-blue-600 font-bold text-sm whitespace-nowrap">Voir l'offre →</span>
            </div>
          </Link>
        ))}
      </div>

      <RecruiterCTA />
    </div>
  );
};

export default CityJobs;
