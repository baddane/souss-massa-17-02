import { supabaseOffers as supabase } from './supabase';

// Helper function to ensure supabase is available
const ensureSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  return supabase;
};

export interface Company {
  id: string;
  nom: string;
  secteur: string;
  ville: string;
  site_web: string;
  nb_employes: string;
  date_ajout: string;
  presentation: string;
  seo_keywords: string;
  meta_description: string;
  specialites: string;
  slug: string;
  created_at: string;
}

export interface School {
  id: string;
  nom: string;
  type_ecole: string;
  ville: string;
  site_web: string;
  date_ajout: string;
  presentation: string;
  seo_keywords: string;
  meta_description: string;
  filieres: string[];
  niveaux_acces: string[];
  slug: string;
  created_at: string;
}

export interface AdviceCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
}

export interface AdviceArticle {
  id: string;
  titre: string;
  slug: string;
  thematique: string;
  contenu: string;
  meta_title: string;
  meta_description: string;
  seo_keywords: string;
  date_publi: string;
  temps_lecture: number;
  created_at: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  category_id: string;
  author: string;
  author_bio: string;
  author_avatar_url: string;
  featured_image_url: string;
  reading_time: number;
  tags: string[];
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  category?: BlogCategory;
}

export const dataService = {
  // Companies
  getCompanies: async (filters?: { ville?: string; secteur?: string }): Promise<Company[]> => {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    let query = supabase.from('entreprises').select('*');

    if (filters?.ville) {
      query = query.eq('ville', filters.ville);
    }

    if (filters?.secteur) {
      query = query.eq('secteur', filters.secteur);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
    
    return data || [];
  },

  getCompanyById: async (id: string): Promise<Company | null> => {
    const { data, error } = await ensureSupabase()
      .from('entreprises')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching company:', error);
      throw error;
    }
    
    return data;
  },

  createCompany: async (companyData: Omit<Company, 'id' | 'created_at'>): Promise<Company> => {
    const { data, error } = await supabase
      .from('entreprises')
      .insert([companyData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating company:', error);
      throw error;
    }
    
    return data;
  },

  updateCompany: async (id: string, companyData: Partial<Company>): Promise<Company> => {
    const { data, error } = await supabase
      .from('entreprises')
      .update(companyData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating company:', error);
      throw error;
    }
    
    return data;
  },

  deleteCompany: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('entreprises')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  },

  // Schools
  getSchools: async (filters?: { ville?: string; type_ecole?: string }): Promise<School[]> => {
    let query = supabase.from('ecoles').select('*');

    if (filters?.ville) {
      query = query.eq('ville', filters.ville);
    }

    if (filters?.type_ecole) {
      query = query.eq('type_ecole', filters.type_ecole);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching schools:', error);
      throw error;
    }
    
    return data || [];
  },

  getSchoolById: async (id: string): Promise<School | null> => {
    const { data, error } = await supabase
      .from('ecoles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching school:', error);
      throw error;
    }
    
    return data;
  },

  createSchool: async (schoolData: Omit<School, 'id' | 'created_at'>): Promise<School> => {
    const { data, error } = await supabase
      .from('ecoles')
      .insert([schoolData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating school:', error);
      throw error;
    }
    
    return data;
  },

  updateSchool: async (id: string, schoolData: Partial<School>): Promise<School> => {
    const { data, error } = await supabase
      .from('ecoles')
      .update(schoolData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating school:', error);
      throw error;
    }
    
    return data;
  },

  deleteSchool: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('ecoles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting school:', error);
      throw error;
    }
  },

  // Advice Categories
  getAdviceCategories: async (): Promise<AdviceCategory[]> => {
    const { data, error } = await supabase
      .from('advice_categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching advice categories:', error);
      throw error;
    }
    
    return data || [];
  },

  getAdviceCategoryById: async (id: string): Promise<AdviceCategory | null> => {
    const { data, error } = await supabase
      .from('advice_categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching advice category:', error);
      throw error;
    }
    
    return data;
  },

  // Advice Articles
  getAdviceArticles: async (filters?: { thematique?: string }): Promise<AdviceArticle[]> => {
    let query = supabase
      .from('conseils')
      .select('*');

    if (filters?.thematique) {
      query = query.eq('thematique', filters.thematique);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching advice articles:', error);
      throw error;
    }
    
    return data || [];
  },

  getAdviceArticleById: async (id: string): Promise<AdviceArticle | null> => {
    const { data, error } = await supabase
      .from('conseils')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching advice article:', error);
      throw error;
    }

    return data;
  },

  getAdviceArticleBySlug: async (slug: string): Promise<AdviceArticle | null> => {
    const { data, error } = await supabase
      .from('conseils')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching advice article by slug:', error);
      return null;
    }

    return data;
  },

  createAdviceArticle: async (articleData: Omit<AdviceArticle, 'id' | 'created_at'>): Promise<AdviceArticle> => {
    const { data, error } = await supabase
      .from('conseils')
      .insert([articleData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating advice article:', error);
      throw error;
    }
    
    return data;
  },

  updateAdviceArticle: async (id: string, articleData: Partial<AdviceArticle>): Promise<AdviceArticle> => {
    const { data, error } = await supabase
      .from('conseils')
      .update(articleData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating advice article:', error);
      throw error;
    }
    
    return data;
  },

  deleteAdviceArticle: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('conseils')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting advice article:', error);
      throw error;
    }
  },

  // Blog Categories
  getBlogCategories: async (): Promise<BlogCategory[]> => {
    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching blog categories:', error);
      throw error;
    }
    
    return data || [];
  },

  getBlogCategoryById: async (id: string): Promise<BlogCategory | null> => {
    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching blog category:', error);
      throw error;
    }
    
    return data;
  },

  getBlogCategoryBySlug: async (slug: string): Promise<BlogCategory | null> => {
    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) {
      console.error('Error fetching blog category by slug:', error);
      throw error;
    }
    
    return data;
  },

  // Blog Posts
  getBlogPosts: async (filters?: { categoryId?: string; slug?: string; published?: boolean; tags?: string[] }): Promise<BlogPost[]> => {
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(id, name, slug)
      `);
    
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    
    if (filters?.slug) {
      query = query.eq('slug', filters.slug);
    }
    
    if (filters?.published !== undefined) {
      query = query.eq('is_published', filters.published);
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    
    const { data, error } = await query.order('published_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching blog posts:', error);
      throw error;
    }
    
    return data || [];
  },

  getBlogPostById: async (id: string): Promise<BlogPost | null> => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(id, name, slug)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching blog post:', error);
      throw error;
    }
    
    return data;
  },

  getBlogPostBySlug: async (slug: string): Promise<BlogPost | null> => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(id, name, slug)
      `)
      .eq('slug', slug)
      .single();
    
    if (error) {
      console.error('Error fetching blog post by slug:', error);
      throw error;
    }
    
    return data;
  },

  createBlogPost: async (postData: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>): Promise<BlogPost> => {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([postData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating blog post:', error);
      throw error;
    }
    
    return data;
  },

  updateBlogPost: async (id: string, postData: Partial<BlogPost>): Promise<BlogPost> => {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(postData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating blog post:', error);
      throw error;
    }
    
    return data;
  },

  deleteBlogPost: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting blog post:', error);
      throw error;
    }
  },

  // Utility functions
  getCompaniesByCity: async (city: string): Promise<Company[]> => {
    return dataService.getCompanies({ ville: city });
  },

  getSchoolsByCity: async (city: string): Promise<School[]> => {
    return dataService.getSchools({ ville: city });
  },

  getAdviceArticlesByThematique: async (thematique: string): Promise<AdviceArticle[]> => {
    return dataService.getAdviceArticles({ thematique });
  },

  getBlogPostsByCategory: async (categoryId: string): Promise<BlogPost[]> => {
    return dataService.getBlogPosts({ categoryId, published: true });
  },

  getBlogPostsByTags: async (tags: string[]): Promise<BlogPost[]> => {
    return dataService.getBlogPosts({ tags, published: true });
  },

  getPublishedAdviceArticles: async (): Promise<AdviceArticle[]> => {
    return dataService.getAdviceArticles();
  },

  getPublishedBlogPosts: async (): Promise<BlogPost[]> => {
    return dataService.getBlogPosts({ published: true });
  }
};