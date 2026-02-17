import { supabase, supabaseUrl } from '../src/services/supabase';

// Vérification que le client Supabase est correctement configuré
if (!supabase) {
  console.error('Supabase client not properly configured. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
  throw new Error('Supabase client not properly configured');
}

// Types pour les données
export interface StudentProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  education_level: string | null;
  field_of_study: string | null;
  graduation_year: number | null;
  skills: string[];
  languages: string[];
  experience_years: number;
  cv_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  availability: string | null;
  work_permit: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_description: string | null;
  company_size: string | null;
  industry: string | null;
  website_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  logo_url: string | null;
  company_type: string | null;
  founded_year: number | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobOffer {
  id: string;
  company_id: string;
  title: string;
  description: string;
  requirements: string;
  responsibilities: string | null;
  contract_type: string;
  work_type: string;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  location_city: string;
  location_country: string;
  is_remote: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface Application {
  id: string;
  job_offer_id: string;
  student_id: string;
  status: string;
  cover_letter: string | null;
  submitted_at: string;
  updated_at: string;
  viewed_by_company: boolean;
}

// Service pour l'authentification
export const authService = {
  // Inscription
  async signUp(email: string, password: string, role: 'student' | 'company') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          profile_status: 'incomplete'
        }
      }
    });

    if (error) throw error;
    return data;
  },

  // Connexion
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  // Déconnexion
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Récupération du mot de passe
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  // Écouteur d'événements d'authentification
  onAuthStateChange(callback: (event: any, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Service pour les profils étudiants
export const studentService = {
  // Créer un profil étudiant
  async createProfile(profileData: Partial<StudentProfile>) {
    const { data, error } = await supabase
      .from('student_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour un profil étudiant
  async updateProfile(profileId: string, profileData: Partial<StudentProfile>) {
    const { data, error } = await supabase
      .from('student_profiles')
      .update(profileData)
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtenir le profil étudiant
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Téléverser un CV
  async uploadCV(file: File, userId: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/cv.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('cv-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    
    // Obtenir l'URL publique
    const { data: publicData } = supabase.storage
      .from('cv-files')
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  },

  // Parser un CV avec Gemini
  async parseCV(file: File, userId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    const response = await fetch(`${supabaseUrl}/functions/v1/cv-parser/parse-cv`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to parse CV');
    }

    return response.json();
  }
};

// Service pour les profils entreprises
export const companyService = {
  // Créer un profil entreprise
  async createProfile(profileData: Partial<CompanyProfile>) {
    const { data, error } = await supabase
      .from('company_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour un profil entreprise
  async updateProfile(profileId: string, profileData: Partial<CompanyProfile>) {
    const { data, error } = await supabase
      .from('company_profiles')
      .update(profileData)
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtenir le profil entreprise
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Téléverser un logo
  async uploadLogo(file: File, userId: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/logo.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('company-logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    
    // Obtenir l'URL publique
    const { data: publicData } = supabase.storage
      .from('company-logos')
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  },

  // Parser un document entreprise avec Gemini
  async parseCompanyDoc(file: File, userId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    const response = await fetch(`${supabaseUrl}/functions/v1/cv-parser/parse-company-doc`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to parse company document');
    }

    return response.json();
  }
};

// Service pour les offres d'emploi
export const jobService = {
  // Créer une offre d'emploi
  async createJob(jobData: Partial<JobOffer>) {
    const { data, error } = await supabase
      .from('job_offers')
      .insert(jobData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour une offre d'emploi
  async updateJob(jobId: string, jobData: Partial<JobOffer>) {
    const { data, error } = await supabase
      .from('job_offers')
      .update(jobData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtenir les offres d'une entreprise
  async getCompanyJobs(companyId: string) {
    const { data, error } = await supabase
      .from('job_offers')
      .select(`
        *,
        company_profiles (
          company_name,
          logo_url
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtenir toutes les offres actives
  async getActiveJobs(filters?: {
    contract_type?: string;
    work_type?: string;
    location?: string;
    search?: string;
  }) {
    let query = supabase
      .from('job_offers')
      .select(`
        *,
        company_profiles (
          company_name,
          logo_url
        )
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filters?.contract_type) {
      query = query.eq('contract_type', filters.contract_type);
    }

    if (filters?.work_type) {
      query = query.eq('work_type', filters.work_type);
    }

    if (filters?.location) {
      query = query.ilike('location_city', `%${filters.location}%`);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,requirements.ilike.%${filters.search}%`
      );
    }

    const { data, error, count } = await query;
    
    if (error) throw error;
    return { data, count };
  },

  // Obtenir une offre par ID
  async getJobById(jobId: string) {
    const { data, error } = await supabase
      .from('job_offers')
      .select(`
        *,
        company_profiles (
          company_name,
          logo_url,
          company_description
        )
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data;
  }
};

// Service pour les candidatures
export const applicationService = {
  // Créer une candidature
  async createApplication(applicationData: {
    job_offer_id: string;
    student_id: string;
    cover_letter?: string;
  }) {
    const { data, error } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour le statut d'une candidature
  async updateApplicationStatus(applicationId: string, status: string) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtenir les candidatures d'un étudiant
  async getStudentApplications(studentId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_offers (
          title,
          contract_type,
          work_type,
          company_profiles (
            company_name,
            logo_url
          )
        )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtenir les candidatures pour une offre
  async getJobApplications(jobOfferId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        student_profiles (
          first_name,
          last_name,
          phone,
          email,
          cv_url,
          skills
        )
      `)
      .eq('job_offer_id', jobOfferId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// Service pour les notifications
export const notificationService = {
  // Créer une notification
  async createNotification(notificationData: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Marquer une notification comme lue
  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtenir les notifications d'un utilisateur
  async getUserNotifications(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Obtenir le nombre de notifications non lues
  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }
};

// Service pour les écoles
export const schoolService = {
  // Obtenir toutes les écoles partenaires
  async getPartnerSchools() {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('is_partner', true)
      .order('name');

    if (error) throw error;
    return data;
  },

  // Obtenir une école par ID
  async getSchoolById(schoolId: string) {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (error) throw error;
    return data;
  }
};

// Service pour les articles
export const articleService = {
  // Obtenir les articles publiés
  async getPublishedArticles(category?: string, limit: number = 10) {
    let query = supabase
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.limit(limit);

    if (error) throw error;
    return data;
  },

  // Obtenir un article par slug
  async getArticleBySlug(slug: string) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error) throw error;
    return data;
  }
};

// Service pour les statistiques
export const statsService = {
  // Obtenir les statistiques d'une entreprise
  async getCompanyStats(companyId: string) {
    const { data, error } = await supabase
      .from('company_job_stats')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    return data;
  },

  // Obtenir les statistiques d'une offre
  async getJobStats(jobId: string) {
    const { data, error } = await supabase
      .from('job_application_stats')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error) throw error;
    return data;
  }
};