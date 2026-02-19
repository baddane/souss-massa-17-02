import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../src/services/dataService';
import { AdviceArticle } from '../src/services/dataService';

const Advice: React.FC = () => {
  const [articles, setArticles] = useState<AdviceArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThematique, setSelectedThematique] = useState('');

  const thematiques = Array.from(new Set(articles.map(a => a.thematique).filter(Boolean))).sort();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const articlesData = await dataService.getAdviceArticles();
        setArticles(articlesData);
      } catch (error) {
        console.error('Error loading advice data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredArticles = articles.filter(article =>
    !selectedThematique || article.thematique === selectedThematique
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conseils Carrière</h1>
        <p className="text-gray-600">Des conseils et astuces pour booster votre carrière dans le Souss-Massa</p>
      </div>

      {/* Thematiques Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedThematique('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedThematique
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous les conseils
          </button>
          {thematiques.map(thematique => (
            <button
              key={thematique}
              onClick={() => setSelectedThematique(thematique)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedThematique === thematique
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {thematique}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredArticles.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg">Aucun article trouvé</div>
            <p className="text-gray-400 mt-2">Sélectionnez une autre thématique ou revenez plus tard</p>
          </div>
        ) : (
          filteredArticles.map((article) => (
            <article key={article.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  {article.thematique && (
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                      {article.thematique}
                    </span>
                  )}
                  {article.temps_lecture && (
                    <span className="text-sm text-gray-500 flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{article.temps_lecture} min</span>
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                  <Link to={`/conseils/${article.slug}`}>
                    {article.titre}
                  </Link>
                </h2>

                {/* Article Content Preview */}
                <div className="text-gray-600 text-sm line-clamp-4 mb-4">
                  {article.contenu?.replace(/<[^>]*>/g, '').slice(0, 200)}...
                </div>

                {article.date_publi && (
                  <div className="text-xs text-gray-400 mb-4">
                    {new Date(article.date_publi).toLocaleDateString('fr-FR')}
                  </div>
                )}

                {/* Read More */}
                <Link
                  to={`/conseils/${article.slug}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  Lire l'article
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Statistiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{articles.length}</div>
            <div className="text-gray-600">Articles</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{thematiques.length}</div>
            <div className="text-gray-600">Thématiques</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {articles.reduce((acc, article) => acc + (article.temps_lecture || 0), 0)}
            </div>
            <div className="text-gray-600">Minutes de lecture</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advice;
