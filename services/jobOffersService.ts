import { createClient } from '@supabase/supabase-js';

// Configuration Supabase avec vos credentials
const supabaseUrl = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

// Initialisation du client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour les offres d'emploi
export interface JobOffer {
  id: string;
  created_at: string;
  ville: string;
  ref_offre: string;
  type_contrat: string;
  raison_sociale: string;
  date_offre: string;
  nbre_postes: number;
  emploi_metier: string;
  full_description: string;
  seo_keywords: string[];
  meta_description: string;
  suggested_salary_range: string;
  required_skills: string[];
}

// Service pour les offres d'emploi
export const jobOffersService = {
  // Obtenir toutes les offres d'emploi
  async getAllJobOffers(): Promise<JobOffer[]> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching job offers:', error);
      throw error;
    }

    return data || [];
  },

  // Obtenir une offre par ID
  async getJobOfferById(id: string): Promise<JobOffer | null> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching job offer:', error);
      throw error;
    }

    return data || null;
  },

  // Obtenir les offres par ville
  async getJobOffersByCity(city: string): Promise<JobOffer[]> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .ilike('ville', `%${city}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching job offers by city:', error);
      throw error;
    }

    return data || [];
  },

  // Obtenir les offres par type de contrat
  async getJobOffersByContractType(contractType: string): Promise<JobOffer[]> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .eq('type_contrat', contractType)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching job offers by contract type:', error);
      throw error;
    }

    return data || [];
  },

  // Obtenir les offres par métier
  async getJobOffersByJobTitle(jobTitle: string): Promise<JobOffer[]> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .ilike('emploi_metier', `%${jobTitle}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching job offers by job title:', error);
      throw error;
    }

    return data || [];
  },

  // Recherche avancée avec plusieurs critères
  async searchJobOffers(filters: {
    city?: string;
    contractType?: string;
    jobTitle?: string;
    keywords?: string;
  }): Promise<JobOffer[]> {
    let query = supabase
      .from('job_offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.city) {
      query = query.ilike('ville', `%${filters.city}%`);
    }

    if (filters.contractType) {
      query = query.eq('type_contrat', filters.contractType);
    }

    if (filters.jobTitle) {
      query = query.ilike('emploi_metier', `%${filters.jobTitle}%`);
    }

    if (filters.keywords) {
      // Recherche dans plusieurs champs avec les mots-clés
      query = query.or(
        `emploi_metier.ilike.%${filters.keywords}%,full_description.ilike.%${filters.keywords}%,raison_sociale.ilike.%${filters.keywords}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching job offers:', error);
      throw error;
    }

    return data || [];
  },

  // Obtenir les offres les plus récentes
  async getRecentJobOffers(limit: number = 10): Promise<JobOffer[]> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent job offers:', error);
      throw error;
    }

    return data || [];
  },

  // Obtenir les offres par compétences requises
  async getJobOffersBySkills(skills: string[]): Promise<JobOffer[]> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .overlaps('required_skills', skills)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching job offers by skills:', error);
      throw error;
    }

    return data || [];
  },

  // Obtenir les statistiques des offres
  async getJobOffersStats() {
    // Compter le nombre total d'offres
    const { count: totalOffers } = await supabase
      .from('job_offers')
      .select('*', { count: 'exact', head: true });

    // Compter par type de contrat
    const { data: contractStats } = await supabase
      .from('job_offers')
      .select('type_contrat, count(*)')
      .group('type_contrat');

    // Compter par ville
    const { data: cityStats } = await supabase
      .from('job_offers')
      .select('ville, count(*)')
      .group('ville')
      .order('count', { ascending: false });

    // Compter par métier
    const { data: jobTitleStats } = await supabase
      .from('job_offers')
      .select('emploi_metier, count(*)')
      .group('emploi_metier')
      .order('count', { ascending: false })
      .limit(10);

    return {
      totalOffers: totalOffers || 0,
      contractStats: contractStats || [],
      cityStats: cityStats || [],
      jobTitleStats: jobTitleStats || []
    };
  }
};

// Fonctions utilitaires pour le formatage
export const formatJobOffer = {
  // Formater la date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Formater le type de contrat
  formatContractType(contractType: string): string {
    const contractTypes: Record<string, string> = {
      'CDI': 'Contrat à Durée Indéterminée',
      'CDD': 'Contrat à Durée Déterminée',
      'Stage': 'Stage',
      'Alternance': 'Alternance',
      'Freelance': 'Freelance',
      'Intérim': 'Intérim'
    };
    return contractTypes[contractType] || contractType;
  },

  // Formater le nombre de postes
  formatNumberOfPositions(nbre_postes: number): string {
    if (nbre_postes === 1) {
      return '1 poste';
    }
    return `${nbre_postes} postes`;
  },

  // Extraire un extrait de la description
  extractDescriptionExcerpt(full_description: string, maxLength: number = 200): string {
    if (full_description.length <= maxLength) {
      return full_description;
    }
    return full_description.substring(0, maxLength) + '...';
  },

  // Formater les compétences requises
  formatRequiredSkills(required_skills: string[]): string {
    if (!required_skills || required_skills.length === 0) {
      return 'Non spécifié';
    }
    return required_skills.join(', ');
  }
};