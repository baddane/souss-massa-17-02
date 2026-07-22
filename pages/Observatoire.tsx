import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { useT } from '../src/i18n/LanguageContext';
import {
  observatoireService, ObsArticle, ObsCategorie,
  OBS_CATEGORIES, obsCategorieLabel, obsCategorieEmoji,
} from '../src/services/observatoireService';

const Observatoire: React.FC = () => {
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const cat = (params.get('cat') || '') as ObsCategorie | '';
  const [articles, setArticles] = useState<ObsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    observatoireService.list(cat || undefined).then((a) => { setArticles(a); setLoading(false); });
  }, [cat]);

  const setCat = (c: string) => {
    if (c) params.set('cat', c); else params.delete('cat');
    setParams(params, { replace: true });
  };

  const [featured, ...rest] = articles;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <SEO
        title={t('obs.title')}
        description={t('obs.subtitle')}
        canonical="/observatoire"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${t('obs.title')} | SoussMassa-RH`,
          description: t('obs.subtitle'),
          url: 'https://soussmassa-rh.com/observatoire',
        }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 sm:p-12 text-white mb-8">
        <p className="text-blue-200 font-semibold text-sm uppercase tracking-widest mb-2">Souss-Massa</p>
        <h1 className="text-3xl sm:text-4xl font-black mb-3">{t('obs.title')}</h1>
        <p className="text-blue-100 max-w-2xl">{t('obs.subtitle')}</p>
      </div>

      {/* Filtres catégories */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setCat('')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${!cat ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
        >
          {t('obs.all')}
        </button>
        {OBS_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCat(c.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${cat === c.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="text-4xl mb-3">🗞️</div>
          <p className="text-gray-500">{t('obs.empty')}</p>
        </div>
      ) : (
        <>
          {/* Article à la une */}
          {featured && !cat && (
            <Link to={`/observatoire/${featured.slug}`}
              className="block bg-white rounded-3xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all mb-8">
              <div className="p-8">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
                  <span>{obsCategorieEmoji(featured.categorie)} {obsCategorieLabel(featured.categorie)}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-400">{featured.date_publi}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">{featured.cover_emoji} {featured.titre}</h2>
                {featured.chapo && <p className="text-gray-600 max-w-3xl">{featured.chapo}</p>}
                <span className="inline-block mt-4 text-blue-600 font-bold text-sm">{t('obs.readMore')} →</span>
              </div>
            </Link>
          )}

          {/* Grille */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(cat ? articles : rest).map((a) => (
              <Link key={a.id} to={`/observatoire/${a.slug}`}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                  {obsCategorieEmoji(a.categorie)} {obsCategorieLabel(a.categorie)}
                </div>
                <h3 className="font-black text-gray-900 text-lg mb-2 leading-snug">{a.cover_emoji} {a.titre}</h3>
                {a.chapo && <p className="text-gray-500 text-sm flex-1 line-clamp-3">{a.chapo}</p>}
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-4">
                  <span>{a.date_publi}</span>
                  {a.temps_lecture ? <><span>•</span><span>{t('obs.minRead', { n: a.temps_lecture })}</span></> : null}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Observatoire;
