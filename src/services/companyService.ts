import { supabaseOffers } from './supabase';

// ---- Types ----
export interface CompanyProfile {
  id: string;
  email: string;
  nom_entreprise: string;
  telephone: string | null;
  ville: string | null;
  secteur: string | null;
  statut: 'en_attente' | 'valide' | 'refuse';
  created_at: string;
  validated_at: string | null;
  notified: boolean;
}

export interface OfferForm {
  emploi_metier: string;
  ville: string;
  type_contrat: string;
  nbre_postes: number;
  suggested_salary_range?: string;
  full_description: string;
  required_skills: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const rand = (n = 5) => Math.random().toString(36).slice(2, 2 + n);

// ---- Authentification ----
export const companyAuth = {
  async signUp(email: string, password: string, profile: Omit<CompanyProfile, 'id' | 'email' | 'statut' | 'created_at' | 'validated_at' | 'notified'>) {
    const { data, error } = await supabaseOffers.auth.signUp({ email, password });
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId) throw new Error("La création du compte a échoué.");

    const { error: insErr } = await supabaseOffers.from('comptes_entreprise').insert({
      id: userId,
      email,
      nom_entreprise: profile.nom_entreprise,
      telephone: profile.telephone || null,
      ville: profile.ville || null,
      secteur: profile.secteur || null,
      statut: 'en_attente',
    });
    if (insErr) throw insErr;
    // On déconnecte : le compte attend la validation admin.
    await supabaseOffers.auth.signOut();
    return userId;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabaseOffers.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signInWithGoogle() {
    const redirectTo = `${window.location.origin}/espace-entreprise`;
    const { error } = await supabaseOffers.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  },

  async signOut() {
    await supabaseOffers.auth.signOut();
  },

  async currentUser() {
    const { data } = await supabaseOffers.auth.getUser();
    return data.user || null;
  },
};

// ---- Profil entreprise ----
export const companyService = {
  // Cree le profil entreprise pour un utilisateur deja authentifie (ex: connexion Google)
  async createProfile(userId: string, email: string, profile: { nom_entreprise: string; telephone?: string; ville?: string; secteur?: string }) {
    const { error } = await supabaseOffers.from('comptes_entreprise').insert({
      id: userId,
      email,
      nom_entreprise: profile.nom_entreprise,
      telephone: profile.telephone || null,
      ville: profile.ville || null,
      secteur: profile.secteur || null,
      statut: 'en_attente',
    });
    if (error) throw error;
  },

  async getProfile(userId: string): Promise<CompanyProfile | null> {
    const { data, error } = await supabaseOffers
      .from('comptes_entreprise')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) { console.error('getProfile', error); return null; }
    return data as CompanyProfile | null;
  },

  async getMyOffers(companyId: string) {
    const { data, error } = await supabaseOffers
      .from('job_offers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) { console.error('getMyOffers', error); return []; }
    return data || [];
  },

  async createOffer(profile: CompanyProfile, form: OfferForm) {
    const today = new Date().toISOString().split('T')[0];
    // slug unique
    let slug = slugify(`${form.emploi_metier}-${form.ville}`);
    const { data: existing } = await supabaseOffers
      .from('job_offers')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    if (existing) slug = `${slug}-${rand(4)}`;

    const record = {
      id: `ent-${Date.now()}-${rand(4)}`,
      company_id: profile.id,
      ville: form.ville,
      ref_offre: `ENT-${today.replace(/-/g, '').slice(2)}-${rand(4).toUpperCase()}`,
      type_contrat: form.type_contrat,
      raison_sociale: profile.nom_entreprise,
      date_offre: today,
      nbre_postes: form.nbre_postes || 1,
      emploi_metier: form.emploi_metier,
      full_description: form.full_description,
      required_skills: form.required_skills,
      suggested_salary_range: form.suggested_salary_range || null,
      meta_description: `${form.emploi_metier} à ${form.ville} - ${form.type_contrat} chez ${profile.nom_entreprise}.`.slice(0, 160),
      seo_keywords: [`emploi ${form.ville.toLowerCase()}`, `${form.emploi_metier.toLowerCase()} maroc`, 'recrutement souss-massa'],
      source: 'entreprise',
      slug,
      statut: 'en_attente',
      is_featured: false,
    };
    const { error } = await supabaseOffers.from('job_offers').insert(record);
    if (error) throw error;
    return record;
  },
};

// ---- Modération (admin) ----
export const moderationService = {
  async getCompanies() {
    const { data, error } = await supabaseOffers
      .from('comptes_entreprise')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('getCompanies', error); return []; }
    return (data || []) as CompanyProfile[];
  },

  async setCompanyStatus(id: string, statut: 'valide' | 'refuse') {
    const patch: Record<string, unknown> = { statut };
    if (statut === 'valide') patch.validated_at = new Date().toISOString();
    const { error } = await supabaseOffers.from('comptes_entreprise').update(patch).eq('id', id);
    if (error) throw error;
  },

  async markNotified(id: string) {
    await supabaseOffers.from('comptes_entreprise').update({ notified: true }).eq('id', id);
  },

  // Supprime définitivement une entreprise, quel que soit son statut (même validée)
  async deleteCompany(id: string) {
    const { error } = await supabaseOffers.from('comptes_entreprise').delete().eq('id', id);
    if (error) throw error;
  },

  async getPendingOffers() {
    const { data, error } = await supabaseOffers
      .from('job_offers')
      .select('*')
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: false });
    if (error) { console.error('getPendingOffers', error); return []; }
    return data || [];
  },

  async setOfferStatus(id: string, statut: 'active' | 'refuse') {
    const { error } = await supabaseOffers.from('job_offers').update({ statut }).eq('id', id);
    if (error) throw error;
  },
};
