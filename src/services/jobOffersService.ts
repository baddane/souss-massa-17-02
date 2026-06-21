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
      if (filters.keywords === 'cat:tourisme') {
        query = query.or(
          `emploi_metier.ilike.%tourisme%,emploi_metier.ilike.%hotel%,emploi_metier.ilike.%restauration%,emploi_metier.ilike.%cuisinier%,emploi_metier.ilike.%serveur%,emploi_metier.ilike.%barman%,emploi_metier.ilike.%chef de partie%,emploi_metier.ilike.%chef de restauration%,emploi_metier.ilike.%commis%,emploi_metier.ilike.%étage%,emploi_metier.ilike.%réception%,raison_sociale.ilike.%hotel%,raison_sociale.ilike.%balneaire%`
        );
      } else {
        query = query.or(
          `emploi_metier.ilike.%${filters.keywords}%,raison_sociale.ilike.%${filters.keywords}%`
        );
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error searching job offers from external DB:', error);
      return [];
    }
    
    return data || [];
  },

  async getJobOfferById(id: string) {
    const { data, error } = await supabaseOffers
      .from('job_offers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching job offer by ID:', error);
      return null;
    }

    return data;
  },

  async getJobOfferBySlug(slug: string) {
    const { data, error } = await supabaseOffers
      .from('job_offers')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching job offer by slug:', error);
      return null;
    }

    return data;
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