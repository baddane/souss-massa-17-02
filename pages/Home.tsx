
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobOffersService } from '../services/jobOffersService';
import { SOUSS_MASSA_CITIES } from '../constants';
import SEO, { generateJobPostingJsonLd } from '../components/SEO';
import {
  useT,
  localizeOffer,
  cityLabel,
  contractShort,
  positionsLabel,
} from '../src/i18n/LanguageContext';

const POPULAR_CATEGORIES = [
  { icon: '💻', query: 'informatique' },
  { icon: '🛒', query: 'commercial' },
  { icon: '📋', query: 'administratif' },
  { icon: '🏭', query: 'industrie' },
  { icon: '🏥', query: 'sante' },
  { icon: '📚', query: 'enseignement' },
  { icon: '🏨', query: 'tourisme' },
  { icon: '🏗️', query: 'construction' },
];

const Home: React.FC = () => {
  const { t, lang } = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [recentOffers, setRecentOffers] = useState<any[]>([]);
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCity) params.set('city', selectedCity);
    navigate(`/offres?${params.toString()}`);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const offers = await jobOffersService.getAllJobOffers();
        setAllOffers(offers);
        setRecentOffers(
          offers
            .sort((a: any, b: any) => new Date(b.date_offre).getTime() - new Date(a.date_offre).getTime())
            .slice(0, 12)
        );
      } catch (error) {
        console.error('Error loading offers:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cityStats = allOffers.reduce((acc: Record<string, number>, o) => {
    acc[o.ville] = (acc[o.ville] || 0) + 1;
    return acc;
  }, {});

  const contractStats = allOffers.reduce((acc: Record<string, number>, o) => {
    acc[o.type_contrat] = (acc[o.type_contrat] || 0) + 1;
    return acc;
  }, {});

  const jobListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: recentOffers.slice(0, 5).map((offer, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: generateJobPostingJsonLd(offer),
    })),
  };

  return (
    <>
      <SEO
        title={t('home.seoTitle')}
        description={t('home.seoDescription', { count: allOffers.length })}
        canonical="/"
        jsonLd={jobListJsonLd}
      />

      <div className="space-y-12 pb-16">
        {/* Hero - compact search */}
        <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              {t('home.heroTitle')}
            </h1>
            <p className="text-blue-200 text-lg">
              {loading ? t('common.loading') : t('home.offersAvailable', { count: allOffers.length })}
            </p>

            <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-3xl mx-auto">
              <div className="flex-1 relative">
                <input
                  type="search"
                  placeholder={t('home.searchPlaceholder')}
                  className="w-full ps-10 pe-4 py-3 border-none focus:ring-2 focus:ring-blue-500 rounded-xl text-gray-700 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <svg className="absolute start-3 top-3.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <select
                className="md:w-44 px-4 py-3 border-none focus:ring-2 focus:ring-blue-500 text-gray-600 bg-transparent rounded-xl outline-none"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">{t('city.any')}</option>
                {SOUSS_MASSA_CITIES.map((city) => (
                  <option key={city} value={city}>{cityLabel(t, city)}</option>
                ))}
              </select>

              <button
                type="submit"
                className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
              >
                {t('home.search')}
              </button>
            </form>

            {/* Quick stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {Object.entries(contractStats).slice(0, 4).map(([type, count]) => (
                <Link
                  key={type}
                  to={`/offres?contractType=${type}`}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors"
                >
                  {contractShort(t, type)}: <strong>{count}</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Categories - quick access like marocannonce */}
        <section className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('home.searchByCategory')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {POPULAR_CATEGORIES.map((cat) => (
              <Link
                key={cat.query}
                to={`/offres?sector=${cat.query}`}
                className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="font-medium text-gray-700 group-hover:text-blue-700 text-sm">{t(`sector.${cat.query}`)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Cities - quick access */}
        <section className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('home.offersByCity')}</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(cityStats)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 10)
              .map(([ville, count]) => (
                <Link
                  key={ville}
                  to={`/offres?city=${ville}`}
                  className="bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  {cityLabel(t, ville)} <span className="text-gray-400 ms-1">({count})</span>
                </Link>
              ))}
          </div>
        </section>

        {/* Recent offers - immediately visible */}
        <section className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">{t('home.latestOffers')}</h2>
            <Link to="/offres" className="text-blue-600 font-medium hover:underline text-sm">
              {t('home.seeAll')} <span className="rtl:hidden">→</span><span className="hidden rtl:inline">←</span>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentOffers.map((raw) => {
                const offer = localizeOffer(raw, lang);
                return (
                <Link
                  key={offer.id}
                  to={`/emploi/${offer.slug}`}
                  className="bg-white p-5 rounded-xl border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {offer.raison_sociale.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {offer.emploi_metier}
                    </h3>
                    <p className="text-gray-500 text-sm truncate">{offer.raison_sociale}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">{contractShort(t, offer.type_contrat)}</span>
                      <span className="text-gray-400 text-xs">{cityLabel(t, offer.ville)}</span>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-gray-400 text-xs">{positionsLabel(t, offer.nbre_postes)}</span>
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <time className="text-xs text-gray-400 block" dateTime={offer.date_offre}>
                      {new Date(offer.date_offre).toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' })}
                    </time>
                  </div>
                </Link>
                );
              })}
            </div>
          )}

          {recentOffers.length > 0 && (
            <div className="text-center pt-4">
              <Link
                to="/offres"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                {t('home.seeAllOffers', { count: allOffers.length })}
              </Link>
            </div>
          )}
        </section>

        {/* CTA for companies */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-3">
              <h2 className="text-2xl font-bold">{t('home.recruiting')}</h2>
              <p className="text-blue-200">{t('home.recruitingText')}</p>
            </div>
            <Link
              to="/contact"
              className="bg-white text-blue-700 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              {t('home.contactUs')}
            </Link>
          </div>
        </section>

        {/* SEO text */}
        <section className="max-w-4xl mx-auto px-4">
          <div className="bg-gray-50 rounded-xl p-6 text-sm text-gray-500 leading-relaxed space-y-2">
            <h2 className="font-bold text-gray-700 text-base">{t('home.seoHeading')}</h2>
            <p>{t('home.seoP1')}</p>
            <p>{t('home.seoP2')}</p>
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
