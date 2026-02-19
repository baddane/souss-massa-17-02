import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../src/services/dataService';
import { AdviceArticle, AdviceCategory } from '../src/services/dataService';

const Advice: React.FC = () => {
  const [articles, setArticles] = useState<AdviceArticle[]>([]);
  const [categories, setCategories] = useState<AdviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const articlesData = await dataService.getAdviceArticles();
        setArticles(articlesData);
        setCategories([]);
      } catch (error) {
        console.error('Error loading advice data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredArticles = articles.filter(article => 
    !selectedCategory || article.category_id === selectedCategory
  );

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Non catégorisé';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : '#6B7280';
  };

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

      {/* Categories Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous les conseils
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{ backgroundColor: selectedCategory === category.id ? category.color : '#f3f4f6' }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id ? 'text-white' : 'text-gray-700 hover:opacity-80'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredArticles.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg">Aucun article trouvé</div>
            <p className="text-gray-400 mt-2">Sélectionnez une autre catégorie ou revenez plus tard</p>
          </div>
        ) : (
          filteredArticles.map((article) => (
            <article key={article.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Article Header */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span
                    style={{ backgroundColor: getCategoryColor(article.category_id) }}
                    className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  >
                    {getCategoryName(article.category_id)}
                  </span>
                  {article.reading_time && (
                    <span className="text-sm text-gray-500 flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{article.reading_time} min</span>
                    </span>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                  <Link to={`/conseils/${article.id}`}>
                    {article.title}
                  </Link>
                </h2>
                
                {article.subtitle && (
                  <p className="text-gray-600 text-sm mb-4">{article.subtitle}</p>
                )}

                {/* Author Info */}
                {article.author && (
                  <div className="flex items-center space-x-3 mb-4">
                    {article.author_avatar_url ? (
                      <img src={article.author_avatar_url} alt={article.author} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-600">{article.author.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{article.author}</div>
                      {article.author_title && (
                        <div className="text-sm text-gray-500">{article.author_title}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Article Content Preview */}
                <div className="text-gray-600 text-sm line-clamp-4 mb-4">
                  {article.content.replace(/<[^>]*>/g, '').slice(0, 200)}...
                </div>

                {/* Read More */}
                <Link
                  to={`/conseils/${article.id}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  Lire l'article
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Article Image */}
              {article.featured_image_url && (
                <div className="h-48 bg-gray-100">
                  <img src={article.featured_image_url} alt={article.title} className="w-full h-full object-cover" />
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Statistiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{articles.length}</div>
            <div className="text-gray-600">Articles</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{categories.length}</div>
            <div className="text-gray-600">Catégories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {articles.reduce((acc, article) => acc + (article.reading_time || 0), 0)}
            </div>
            <div className="text-gray-600">Minutes de lecture</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {new Set(articles.map(a => a.author)).size}
            </div>
            <div className="text-gray-600">Auteurs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advice;