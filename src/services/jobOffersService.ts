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
      const expandCategory = (terms: string[]) =>
        terms.map(t => `emploi_metier.ilike.%${t}%`).join(',');

      const CATEGORY_FILTERS: Record<string, string> = {
        informatique: expandCategory(['développeur', 'developpeur', 'informatique', 'technicien R&D', 'opérateur de saisie', 'téléconseiller', 'electronique', 'électronique']),
        commercial: expandCategory(['commercial', 'vendeur', 'vendeuse', 'vente', 'caissier', 'représentant', 'attaché commercial', 'libre service', 'produits frais', 'services commerciaux']),
        administratif: expandCategory(['administratif', 'administrative', 'gestion administrative', 'comptable', 'aide comptable', 'secrétaire', 'employé de bureau', 'standardiste', 'services financiers', 'financier', 'banque', 'souscripteur', 'accueil']),
        industrie: expandCategory(['industrie', 'opérateur', 'production', 'maintenance', 'mécanicien', 'menuisier', 'magasinier', 'conducteur', 'contrôleur', 'construction électrique', 'machines automatiques', 'engins de levage', 'aquaculteur', 'agricole']),
        sante: expandCategory(['infirmier', 'aide soignant', 'pharmacie', 'médical', 'santé', 'sante', 'esthéticien', 'cosméticien', 'vétérinaire']),
        enseignement: expandCategory(['formateur', 'enseignant', 'éducation', 'education', 'formation']),
        tourisme: expandCategory(['tourisme', 'hôtel', 'hotel', 'restauration', 'cuisinier', 'serveur', 'barman', 'chef de partie', 'chef de restauration', 'commis', 'étage', 'réception', 'ménage', 'femme de ménage', 'poissonnier', 'chauffeur touristique', 'polyvalent de restauration', 'responsable restauration']) + ',raison_sociale.ilike.%hotel%,raison_sociale.ilike.%balneaire%',
        construction: expandCategory(['bâtiment', 'batiment', 'construction', 'travaux', 'dessinateur', 'électricien', 'géologue', 'conducteur des travaux', 'cadre technique']),
      };

      const expanded = CATEGORY_FILTERS[filters.keywords];
      if (expanded) {
        query = query.or(expanded);
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