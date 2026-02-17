import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { dataService } from '../src/services/dataService';
import { BlogPost, BlogCategory } from '../src/services/dataService';

const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { slug } = useParams();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [postsData, categoriesData] = await Promise.all([
          dataService.getPublishedBlogPosts(),
          dataService.getBlogCategories()
        ]);
        setPosts(postsData);
        setCategories(categoriesData);
        
        // If a category slug is provided in URL, select it
        if (slug) {
          const category = categoriesData.find(c => c.slug === slug);
          if (category) {
            setSelectedCategory(category.id);
          }
        }
      } catch (error) {
        console.error('Error loading blog data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  // Get all unique tags from posts
  const allTags = Array.from(new Set(posts.flatMap(post => post.tags || []))).sort();

  const filteredPosts = posts.filter(post => {
    const matchesCategory = !selectedCategory || post.category_id === selectedCategory;
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => post.tags?.includes(tag));
    
    return matchesCategory && matchesTags;
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Non catégorisé';
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog & Actualités</h1>
        <p className="text-gray-600">Toute l'actualité de l'emploi et des opportunités dans le Souss-Massa</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Catégories</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredPosts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg">Aucun article trouvé</div>
            <p className="text-gray-400 mt-2">Essayez d'ajuster vos filtres ou revenez plus tard</p>
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedTags([]);
              }}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Post Image */}
              {post.featured_image_url && (
                <div className="h-48 bg-gray-100">
                  <img src={post.featured_image_url} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="p-6">
                {/* Category and Meta */}
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    {getCategoryName(post.category_id)}
                  </span>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {post.reading_time && (
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{post.reading_time} min</span>
                      </span>
                    )}
                    <span>{new Date(post.published_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-purple-600 transition-colors">
                  <Link to={`/blog/${post.id}`}>
                    {post.title}
                  </Link>
                </h2>
                
                {post.subtitle && (
                  <p className="text-gray-600 text-sm mb-4">{post.subtitle}</p>
                )}

                {/* Author Info */}
                {post.author && (
                  <div className="flex items-center space-x-3 mb-4">
                    {post.author_avatar_url ? (
                      <img src={post.author_avatar_url} alt={post.author} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-600">{post.author.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{post.author}</div>
                      {post.author_bio && (
                        <div className="text-sm text-gray-500">{post.author_bio}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content Preview */}
                <div className="text-gray-600 text-sm line-clamp-4 mb-4">
                  {post.content.replace(/<[^>]*>/g, '').slice(0, 250)}...
                </div>

                {/* Read More */}
                <Link
                  to={`/blog/${post.id}`}
                  className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{posts.length}</div>
            <div className="text-gray-600">Articles</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{categories.length}</div>
            <div className="text-gray-600">Catégories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {posts.reduce((acc, post) => acc + (post.reading_time || 0), 0)}
            </div>
            <div className="text-gray-600">Minutes de lecture</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{allTags.length}</div>
            <div className="text-gray-600">Tags</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;