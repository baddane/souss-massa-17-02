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
    return <MarkdownContent key={i} text={part} size="lg" />;
  });
}

// Une source peut s'ecrire de trois facons, par ordre de precision :
//   « [HCP — resultats 2025](https://…) »  libelle + adresse
//   « https://… »                          adresse seule
//   « HCP — resultats 2025 »               texte seul, quand l'adresse est
//                                          inconnue ou le document hors ligne
// Les trois coexistent : les sources deja saisies restent lisibles, et on
// n'invente jamais une adresse pour rendre une ligne cliquable.
const MD_LIEN = /^\s*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/;
const URL_NUE = /(https?:\/\/[^\s)]+)/;

const SourceLink: React.FC<{ source: string }> = ({ source }) => {
  const classes = 'text-blue-600 hover:text-blue-700 underline decoration-blue-200 hover:decoration-blue-400 break-words';

  const md = source.match(MD_LIEN);
  if (md) {
    return <a href={md[2]} target="_blank" rel="noopener noreferrer" className={classes}>{md[1]}</a>;
  }

  const nue = source.match(URL_NUE);
  if (nue) {
    const avant = source.slice(0, nue.index);
    const apres = source.slice((nue.index || 0) + nue[1].length);
    // Une adresse seule s'affiche par son domaine : la ligne reste lisible.
    const libelle = avant.trim() || nue[1].replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    return (
      <>
        <a href={nue[1]} target="_blank" rel="noopener noreferrer" className={classes}>{libelle}</a>
        {apres.trim() && <span className="text-gray-500"> {apres.trim()}</span>}
      </>
    );
  }

  return <span className="text-gray-500">{source}</span>;
};

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
    <article className="max-w-2xl mx-auto px-4 py-12">
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

      <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-5 leading-tight tracking-tight">
        {article.cover_emoji} {article.titre}
      </h1>
      {article.chapo && (
        <p className="text-xl text-gray-600 leading-relaxed mb-8 pb-8 border-b border-gray-100">
          {article.chapo}
        </p>
      )}

      <div className="space-y-2">{renderBody(article)}</div>
      {trailingCharts.map((spec, i) => <ObsChart key={`t${i}`} spec={spec} />)}

      {/* Sources. Ce qui donne son autorite a l'analyse, ce sont les references
          verifiables, pas une signature : elles ferment donc l'article, et
          chaque source dont l'adresse est connue est cliquable. */}
      {article.sources && article.sources.length > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-3">{t('obs.sources')}</h2>
          <ul className="list-disc ps-5 text-sm text-gray-600 space-y-1.5 marker:text-gray-300">
            {article.sources.map((s, i) => <li key={i}><SourceLink source={s} /></li>)}
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
