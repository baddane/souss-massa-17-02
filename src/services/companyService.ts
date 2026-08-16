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

export interface CandidatureRow {
  id: string;
  created_at: string;
  job_ref: string;
  job_title: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  cv_path: string | null;
  cv_filename: string | null;
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

type NewCompanyProfile = Omit<CompanyProfile, 'id' | 'email' | 'statut' | 'created_at' | 'validated_at' | 'notified'>;

// Levée quand l'email est deja pris par un compte entreprise reel (a distinguer
// d'un echec de connexion : le formulaire d'inscription affichait a tort
// « Email ou mot de passe incorrect »).
export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('EMAIL_ALREADY_REGISTERED');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

async function insertProfile(userId: string, email: string, profile: NewCompanyProfile | { nom_entreprise: string; telephone?: string; ville?: string; secteur?: string }) {
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
}

// L'inscription ne demande plus de mot de passe : l'entreprise saisit seulement
// ses coordonnees. Supabase Auth en exige un a la creation du compte, on en pose
// donc un aleatoire, jamais affiche ni conserve. Le vrai mot de passe est genere
// et envoye par email au moment ou l'admin valide le compte (api/notify-company).
function throwawayPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'Tmp-' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
}

// ---- Authentification ----
export const companyAuth = {
  async signUp(email: string, profile: NewCompanyProfile) {
    // Si une session est deja ouverte dans le navigateur (typiquement l'admin,
    // ou une entreprise deja connectee), `signUp` ne cree PAS de compte : il
    // renvoie l'utilisateur courant. La fiche entreprise se retrouvait alors
    // attachee a ce compte — un admin s'est ainsi vu greffer une entreprise,
    // ensuite impossible a supprimer. On repart donc toujours d'une session vide.
    await supabaseOffers.auth.signOut();

    const { data, error } = await supabaseOffers.auth.signUp({ email, password: throwawayPassword() });

    if (error) {
      if (!/registered|already/i.test(error.message || '')) throw error;
      throw new EmailAlreadyRegisteredError();
    }

    const userId = data.user?.id;
    if (!userId) throw new Error("La création du compte a échoué.");

    // Garde-fou : le compte renvoye doit correspondre a l'email saisi. Sinon
    // c'est qu'une session a survecu et qu'on s'apprete a ecrire la fiche sur
    // le mauvais compte.
    if ((data.user?.email || '').toLowerCase() !== email.trim().toLowerCase()) {
      await supabaseOffers.auth.signOut();
      throw new Error("La création du compte a échoué (session existante).");
    }

    try {
      await insertProfile(userId, email, profile);

      // Enregistrement comme lead Brevo, avant la déconnexion (l'endpoint exige
      // le jeton du compte). Best-effort : une panne CRM ne doit jamais faire
      // échouer une inscription déjà enregistrée en base.
      try {
        const token = data.session?.access_token;
        if (token) {
          await fetch('/api/company-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(profile),
          });
        }
      } catch (err) {
        console.error('Synchro Brevo (non bloquante) :', err);
      }
    } finally {
      // On déconnecte dans tous les cas : le compte attend la validation admin.
      await supabaseOffers.auth.signOut();
    }
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

  // L'entreprise remplace le mot de passe recu par email par le sien.
  // Agit sur l'utilisateur de la session en cours : aucun droit admin requis.
  async changePassword(newPassword: string) {
    const { error } = await supabaseOffers.auth.updateUser({ password: newPassword });
    if (error) throw error;
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
    await insertProfile(userId, email, profile);
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

  // Candidatures recues sur les offres de l'entreprise. Le lien se fait par
  // `job_ref` (= job_offers.ref_offre) : la table candidatures ne porte pas de
  // company_id. La RLS (migration 014) applique le meme filtre cote base, donc
  // une entreprise ne peut pas lire les candidatures d'une autre.
  async getMyCandidatures(companyId: string): Promise<CandidatureRow[]> {
    const { data: offers, error: offErr } = await supabaseOffers
      .from('job_offers')
      .select('ref_offre')
      .eq('company_id', companyId);
    if (offErr) { console.error('getMyCandidatures/offers', offErr); return []; }
    const refs = (offers || []).map((o: any) => o.ref_offre).filter(Boolean);
    if (refs.length === 0) return [];

    const { data, error } = await supabaseOffers
      .from('candidatures')
      .select('*')
      .in('job_ref', refs)
      .order('created_at', { ascending: false });
    if (error) { console.error('getMyCandidatures', error); return []; }
    return (data || []) as CandidatureRow[];
  },

  // Le bucket `cvs` est prive : on genere une URL signee de courte duree.
  async candidatureCvUrl(cvPath: string): Promise<string | null> {
    const { data, error } = await supabaseOffers.storage.from('cvs').createSignedUrl(cvPath, 120);
    if (error) { console.error('candidatureCvUrl', error); return null; }
    return data?.signedUrl || null;
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

  // Modification d'une offre existante. Le trigger `job_offers_company_guard`
  // (migration 016) fige l'identite de l'offre et repasse le statut en
  // 'en_attente' : toute modification est donc revalidee par l'admin.
  async updateOffer(offerId: string, profile: CompanyProfile, form: OfferForm) {
    const { error } = await supabaseOffers
      .from('job_offers')
      .update({
        ville: form.ville,
        type_contrat: form.type_contrat,
        nbre_postes: form.nbre_postes || 1,
        emploi_metier: form.emploi_metier,
        full_description: form.full_description,
        required_skills: form.required_skills,
        suggested_salary_range: form.suggested_salary_range || null,
        meta_description: `${form.emploi_metier} à ${form.ville} - ${form.type_contrat} chez ${profile.nom_entreprise}.`.slice(0, 160),
      })
      .eq('id', offerId);
    if (error) throw error;
  },

  // Retrait (l'offre disparait du public) ou remise en validation.
  // Pas de suppression definitive : les candidatures sont reliees a l'offre par
  // `ref_offre` et deviendraient inaccessibles a l'entreprise.
  async setMyOfferStatus(offerId: string, statut: 'retire' | 'en_attente') {
    const { error } = await supabaseOffers.from('job_offers').update({ statut }).eq('id', offerId);
    if (error) throw error;
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

  // Supprime définitivement une entreprise, quel que soit son statut (même validée).
  // Passe par l'endpoint serveur : la fiche ET le compte Supabase Auth doivent
  // partir ensemble, sinon l'email reste réservé et ne peut plus se réinscrire.
  async deleteCompany(id: string) {
    const { data: { session } } = await supabaseOffers.auth.getSession();
    const res = await fetch('/api/delete-company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as any).error || `Echec de la suppression (${res.status})`);
    // Renvoie un avertissement quand le compte Auth a ete conserve (compte admin).
    return (body as any).authAccountKept ? String((body as any).message || '') : '';
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
