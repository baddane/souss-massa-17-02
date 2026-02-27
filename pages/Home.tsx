
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobOffersService } from '../services/jobOffersService';
import { CITIES, SECTORS } from '../constants';

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [featuredOffers, setFeaturedOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/offres?q=${searchQuery}&city=${selectedCity}&sector=${selectedSector}`);
  };

  useEffect(() => {
    const loadFeaturedOffers = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const offers = await jobOffersService.getAllJobOffers();
        const sortedOffers = offers
          .sort((a: any, b: any) => new Date(b.date_offre).getTime() - new Date(a.date_offre).getTime())
          .slice(0, 6);
        setFeaturedOffers(sortedOffers);
      } catch (error) {
        console.error('Error loading featured offers:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedOffers();
  }, []);

  const stats = loading
    ? []
    : [
        {
          title: 'Offres à Agadir',
          count: featuredOffers.filter((o) => o.ville === 'Agadir').length,
          colorClass: 'bg-blue-100 text-blue-700',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          title: 'Stages Souss-Massa',
          count: featuredOffers.filter((o) => o.type_contrat === 'Stage').length,
          colorClass: 'bg-green-100 text-green-700',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          title: 'CDI / Emplois',
          count: featuredOffers.filter((o) => o.type_contrat === 'CDI').length,
          colorClass: 'bg-purple-100 text-purple-700',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
        },
      ];

  return (
    <div className="space-y-16 pb-16">

      {/* Hero Section */}
      <section className="relative bg-blue-700 py-20 px-4 overflow-hidden" aria-labelledby="hero-heading">
        <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <h1 id="hero-heading" className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Boostez votre carrière dans la région Souss-Massa
          </h1>
          <p className="text-xl text-blue-100 font-medium">
            Le portail emploi n°1 à Agadir et ses environs sur soussmassa-rh.com
          </p>

          <form onSubmit={handleSearch} role="search" aria-label="Recherche d'offres d'emploi" className="bg-white p-2 rounded-xl shadow-xl flex flex-col md:flex-row gap-2 max-w-5xl mx-auto">

            <div className="flex-1 relative">
              <label htmlFor="search-metier" className="sr-only">Métier ou mots-clés</label>
              <input
                id="search-metier"
                type="search"
                placeholder="Quel métier cherchez-vous ?"
                className="w-full pl-10 pr-4 py-3 border-none focus:ring-2 focus:ring-blue-500 rounded-lg text-gray-700 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="md:w-48 border-t md:border-t-0 md:border-l border-gray-100">
              <label htmlFor="search-city" className="sr-only">Ville</label>
              <select
                id="search-city"
                className="w-full px-4 py-3 border-none focus:ring-2 focus:ring-blue-500 text-gray-600 bg-transparent cursor-pointer outline-none rounded-lg"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">Toute ville</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="md:w-48 border-t md:border-t-0 md:border-l border-gray-100">
              <label htmlFor="search-sector" className="sr-only">Secteur d'activité</label>
              <select
                id="search-sector"
                className="w-full px-4 py-3 border-none focus:ring-2 focus:ring-blue-500 text-gray-600 bg-transparent cursor-pointer outline-none rounded-lg"
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
              >
                <option value="">Tout secteur</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-orange-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-lg"
            >
              Rechercher
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-6 text-white/90 text-sm" aria-label="Chiffres clés">
            <div><span className="font-bold text-white">+5 000</span> offres régionales</div>
            <div><span className="font-bold text-white">+300</span> entreprises locales</div>
            <div><span className="font-bold text-white">+50 000</span> inscrits</div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section aria-label="Statistiques des offres" className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 animate-pulse" aria-hidden="true">
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))
        ) : (
          stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className={`${stat.colorClass} w-12 h-12 rounded-lg flex items-center justify-center`}>
                {stat.icon}
              </div>
              <div>
                <h3 className="text-gray-500 font-medium text-sm">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Featured Offers */}
      <section aria-labelledby="featured-heading" className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 id="featured-heading" className="text-2xl font-bold text-gray-900">Opportunités à la Une</h2>
            <p className="text-gray-500">Postulez aux meilleures offres du Souss-Massa</p>
          </div>
          <Link to="/offres" className="text-blue-700 font-medium hover:underline">
            Voir toutes les offres
            <span aria-hidden="true"> →</span>
          </Link>
        </div>

        {loadError ? (
          <div role="alert" className="col-span-full text-center py-12 bg-red-50 rounded-xl border border-red-100">
            <p className="text-red-600 font-medium">Impossible de charger les offres pour le moment.</p>
            <p className="text-red-400 text-sm mt-1">Veuillez rafraîchir la page ou réessayer plus tard.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse" aria-hidden="true">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                    <div className="w-16 h-6 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded mb-4" />
                  <div className="h-4 bg-gray-200 rounded" />
                </div>
              ))
            ) : featuredOffers.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">Aucune offre en vedette pour le moment.</p>
              </div>
            ) : (
              featuredOffers.map((offer) => (
                <article key={offer.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                      aria-hidden="true"
                    >
                      {offer.raison_sociale.charAt(0)}
                    </div>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {offer.type_contrat}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors mb-2 line-clamp-2">
                    {offer.emploi_metier}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">{offer.raison_sociale} · {offer.ville}</p>
                  <div className="flex items-center text-gray-400 text-xs mt-4 pt-4 border-t border-gray-50">
                    <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <time dateTime={offer.date_offre}>
                      Publiée le {new Date(offer.date_offre).toLocaleDateString('fr-FR')}
                    </time>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section aria-labelledby="cta-heading" className="max-w-5xl mx-auto px-4">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 md:p-12 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 id="cta-heading" className="text-3xl font-bold">Vous recrutez dans le Souss-Massa ?</h2>
            <p className="text-blue-100 text-lg">Publiez vos annonces et accédez au meilleur vivier de talents locaux.</p>
            <div className="pt-6 flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/inscription" className="bg-white text-blue-700 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors">
                Recruter maintenant
              </Link>
              <Link to="/nos-tarifs" className="bg-blue-600/30 border border-white/30 text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors">
                Voir nos tarifs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
