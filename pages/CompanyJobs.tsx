import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SEO, { slugify } from '../components/SEO';
import { jobOffersService, JobOffer } from '../services/jobOffersService';

const SITE_URL = 'https://soussmassa-rh.com';

const CompanyJobs: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [offers, setOffers] = useState<JobOffer[] | null>(null);

  useEffect(() => {
    let alive = true;
    jobOffersService.getAllJobOffers()
      .then((all) => { if (alive) setOffers(all.filter((o) => slugify(o.raison_sociale || '') === slug)); })
      .catch(() => { if (alive) setOffers([]); });
    return () => { alive = false; };
  }, [slug]);

  if (offers === null) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  }

  // Aucune offre pour cette entreprise → on évite une page vide (mauvais SEO)
  if (offers.length === 0) return <Navigate to="/offres" replace />;

  const company = offers[0].raison_sociale;
  const cities = Array.from(new Set(offers.map((o) => o.ville).filter(Boolean)));
  const totalPostes = offers.reduce((s, o) => s + (Number(o.nbre_postes) || 1), 0);
  const cityLabel = cities.length === 1 ? cities[0] : 'Souss-Massa';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Offres d'emploi — ${company}`,
    itemListElement: offers.slice(0, 30).map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/emploi/${o.slug}`,
      name: o.emploi_metier,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <SEO
        title={`Recrutement ${company} à ${cityLabel} — offres d'emploi`}
        description={`${company} recrute à ${cityLabel} : ${offers.length} offre${offers.length > 1 ? 's' : ''} d'emploi (${totalPostes} poste${totalPostes > 1 ? 's' : ''}) à pourvoir dans la région Souss-Massa. Postulez en ligne.`}
        canonical={`/recrutement/${slug}`}
        jsonLd={jsonLd}
      />

      <nav className="text-sm text-gray-400 mb-4">
        <Link to="/offres" className="hover:text-blue-600">Offres d'emploi</Link>
        <span className="mx-2">/</span>
        <span>Recrutement {company}</span>
      </nav>

      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-3xl p-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0">
            {(company[0] || '?').toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Recrutement {company}</h1>
            <p className="text-blue-100 mt-1 text-sm">
              {offers.length} offre{offers.length > 1 ? 's' : ''} d'emploi · {totalPostes} poste{totalPostes > 1 ? 's' : ''}
              {cities.length > 0 && ` · ${cities.join(', ')}`}
            </p>
          </div>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        <strong>{company}</strong> recrute actuellement à {cities.join(', ') || 'Souss-Massa'}. Découvrez ci-dessous
        ses offres d'emploi et postulez en ligne. Retrouvez aussi toutes les <Link to="/offres" className="text-blue-600 hover:underline">offres d'emploi de la région Souss-Massa</Link>.
      </p>

      <div className="space-y-3">
        {offers.map((o) => (
          <Link key={o.id} to={`/emploi/${o.slug}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{o.emploi_metier}</h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                  {o.ville && <span>{o.ville}</span>}
                  {o.type_contrat && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">{o.type_contrat}</span>}
                  {o.nbre_postes > 1 && <span>{o.nbre_postes} postes</span>}
                </div>
              </div>
              <span className="text-blue-600 font-bold text-sm whitespace-nowrap">Voir l'offre →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CompanyJobs;
