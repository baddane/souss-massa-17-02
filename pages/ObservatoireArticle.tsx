import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO, { generateArticleJsonLd } from '../components/SEO';
import MarkdownContent from '../components/MarkdownContent';
import ObsChart from '../components/ObsChart';
import { useT } from '../src/i18n/LanguageContext';
import { observatoireService, ObsArticle, obsCategorieLabel, obsCategorieEmoji } from '../src/services/observatoireService';

// Découpe le contenu markdown sur les jetons [[chart:N]] et insère les diagrammes.
function renderBody(article: ObsArticle) {
  const parts = (article.contenu || '').split(/\[\[chart:(\d+)\]\]/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const spec = article.charts?.[Number(part)];
      return spec ? <ObsChart key={i} spec={spec} /> : null;
    }
    return <MarkdownContent key={i} text={part} className="prose-obs" />;
  });
}

const ObservatoireArticle: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useT();
  const [article, setArticle] = useState<ObsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    observatoireService.getBySlug(slug || '').then((a) => { setArticle(a); setLoading(false); });
  }, [slug]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <SEO title={t('obs.notFound')} canonical={`/observatoire/${slug}`} />
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('obs.notFound')}</h1>
        <Link to="/observatoire" className="text-blue-600 font-bold">← {t('obs.backHub')}</Link>
      </div>
    );
  }

  // Diagrammes non référencés dans le corps → affichés en fin d'article
  const usedIdx = new Set(Array.from((article.contenu || '').matchAll(/\[\[chart:(\d+)\]\]/g)).map(m => Number(m[1])));
  const trailingCharts = (article.charts || []).filter((_, i) => !usedIdx.has(i));

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <SEO
        title={article.meta_title || article.titre}
        description={article.meta_description || article.chapo || undefined}
        canonical={`/observatoire/${article.slug}`}
        type="article"
        jsonLd={generateArticleJsonLd(article)}
      />

      {/* Fil d'ariane */}
      <nav className="text-sm text-gray-400 mb-4">
        <Link to="/observatoire" className="hover:text-blue-600">{t('obs.title')}</Link>
        <span className="mx-2">/</span>
        <Link to={`/observatoire?cat=${article.categorie}`} className="hover:text-blue-600">{obsCategorieLabel(article.categorie)}</Link>
      </nav>

      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
        <span>{obsCategorieEmoji(article.categorie)} {obsCategorieLabel(article.categorie)}</span>
        <span className="text-gray-300">•</span>
        <span className="text-gray-400">{article.date_publi}</span>
        {article.temps_lecture ? <><span className="text-gray-300">•</span><span className="text-gray-400">{t('obs.minRead', { n: article.temps_lecture })}</span></> : null}
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 leading-tight">
        {article.cover_emoji} {article.titre}
      </h1>
      {article.chapo && <p className="text-lg text-gray-600 mb-8 leading-relaxed">{article.chapo}</p>}

      <div className="space-y-1">{renderBody(article)}</div>
      {trailingCharts.map((spec, i) => <ObsChart key={`t${i}`} spec={spec} />)}

      {/* Sources */}
      {article.sources && article.sources.length > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-2">{t('obs.sources')}</h2>
          <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
            {article.sources.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <Link to="/observatoire" className="text-blue-600 font-bold">← {t('obs.backHub')}</Link>
      </div>
    </article>
  );
};

export default ObservatoireArticle;
