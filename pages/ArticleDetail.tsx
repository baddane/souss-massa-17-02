import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { dataService } from '../src/services/dataService';
import { AdviceArticle } from '../src/services/dataService';

marked.setOptions({ breaks: true, gfm: true });

const ArticleDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<AdviceArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await dataService.getAdviceArticleBySlug(slug);
        if (!data) {
          setNotFound(true);
        } else {
          setArticle(data);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-semibold text-gray-700">Article introuvable</p>
        <Link to="/conseils" className="text-blue-600 hover:underline font-medium">
          ← Retour aux conseils
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux conseils
          </button>
        </div>
      </div>

      {/* Article */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 border-b border-gray-100">
            {/* Meta top row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {article.thematique && (
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wide">
                  {article.thematique}
                </span>
              )}
              {article.temps_lecture && (
                <span className="flex items-center gap-1 text-gray-400 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {article.temps_lecture} min de lecture
                </span>
              )}
              {article.date_publi && (
                <span className="text-gray-400 text-sm">
                  {new Date(article.date_publi).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              {article.titre}
            </h1>

            {/* Meta description as intro */}
            {article.meta_description && (
              <p className="mt-4 text-lg text-gray-500 font-medium leading-relaxed">
                {article.meta_description}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="px-8 py-10">
            <div
              className="prose prose-gray prose-lg max-w-none
                prose-h1:text-3xl prose-h1:font-black prose-h1:text-gray-900 prose-h1:mt-10 prose-h1:mb-4
                prose-h2:text-2xl prose-h2:font-bold prose-h2:text-gray-800 prose-h2:mt-10 prose-h2:mb-3 prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-2
                prose-h3:text-xl prose-h3:font-semibold prose-h3:text-gray-700 prose-h3:mt-8 prose-h3:mb-2
                prose-p:text-gray-700 prose-p:leading-8 prose-p:text-[1.05rem]
                prose-li:text-gray-700 prose-li:leading-7
                prose-ul:my-4 prose-ol:my-4
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-em:text-gray-600
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-4 prose-blockquote:border-blue-300 prose-blockquote:bg-blue-50 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-blockquote:text-gray-600 prose-blockquote:not-italic"
              dangerouslySetInnerHTML={{ __html: marked.parse(article.contenu ?? '') as string }}
            />
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/conseils"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voir tous les conseils
            </Link>
            <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">
              Souss-Massa RH
            </span>
          </div>
        </article>
      </div>
    </div>
  );
};

export default ArticleDetail;
