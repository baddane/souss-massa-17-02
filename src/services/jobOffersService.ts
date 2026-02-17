import { supabaseOffers, supabaseSite } from './supabase';

export const jobOffersService = {
  async getAllJobOffers() {
    // Utilise la base de données externe pour les offres d'emploi
    const { data, error } = await supabaseOffers
      .from('job_offers')
      .select('*')
      .order('date_offre', { ascending: false });
    
    if (error) {
      console.error('Error fetching job offers from external DB:', error);
      return [];
    }
    
    return data || [];
  },

  async searchJobOffers(filters: {
    city?: string;
    contractType?: string;
    jobTitle?: string;
    keywords?: string;
  }) {
    // Utilise la base de données externe pour les offres d'emploi
    let query = supabaseOffers
      .from('job_offers')
      .select('*')
      .order('date_offre', { ascending: false });

    if (filters.city) {
      query = query.eq('ville', filters.city);
    }

    if (filters.contractType) {
      query = query.eq('type_contrat', filters.contractType);
    }

    if (filters.jobTitle) {
      query = query.ilike('emploi_metier', `%${filters.jobTitle}%`);
    }

    if (filters.keywords) {
      query = query.or(
        `emploi_metier.ilike.%${filters.keywords}%,raison_sociale.ilike.%${filters.keywords}%`
      );
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error searching job offers from external DB:', error);
      return [];
    }
    
    return data || [];
  },

  // Nouvelle méthode pour accéder à la base de données du site (si besoin)
  async getSiteData(table: string) {
    if (!supabaseSite) {
      console.warn('Site database not configured');
      return [];
    }
    
    const { data, error } = await supabaseSite
      .from(table)
      .select('*');
    
    if (error) {
      console.error(`Error fetching ${table} from site DB:`, error);
      return [];
    }
    
    return data || [];
  }
};