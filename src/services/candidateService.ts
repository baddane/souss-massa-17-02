import { supabaseOffers } from './supabase';
import { EmailAlreadyRegisteredError } from './companyService';
import type { ParsedCv } from './cvParser';

// Espace candidat : compte, profil, CV, consentement CVthèque et alertes.
//
// Contrairement a l'entreprise, le candidat n'a pas besoin d'etre valide par
// l'admin : il choisit son mot de passe et accede immediatement a son espace.
// C'est volontaire — imposer une moderation a l'inscription des candidats
// tuerait le remplissage de la base, qui est justement ce qui donne de la
// valeur au cote recruteur.

export const DISPONIBILITES = ['immediate', 'sous_1_mois', 'sous_3_mois', 'en_poste'] as const;
export type Disponibilite = typeof DISPONIBILITES[number];

export interface CandidateProfile {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  nom_complet: string;
  telephone: string | null;
  ville: string | null;
  quartier: string | null;
  poste_recherche: string | null;
  niveau_etudes: string | null;
  diplome: string | null;
  competences: string[];
  langues: string[];
  experience_years: number | null;
  disponibilite: Disponibilite | null;
  contrats_souhaites: string[];
  villes_souhaitees: string[];
  cv_path: string | null;
  cv_filename: string | null;
  visible_recruteurs: boolean;
  actif: boolean;
}

export type CandidateProfilePatch = Partial<Omit<CandidateProfile, 'id' | 'email' | 'created_at' | 'updated_at'>>;

export interface MyCandidature {
  id: string;
  created_at: string;
  job_ref: string;
  job_title: string;
  company_name: string | null;
  status: string | null;
  cv_filename: string | null;
  slug?: string | null;      // rempli depuis job_offers quand l'offre est encore en ligne
}

export interface JobAlert {
  id: string;
  created_at: string;
  candidat_id: string;
  email: string;
  intitule: string | null;
  ville: string | null;
  type_contrat: string | null;
  frequence: 'quotidienne' | 'hebdomadaire';
  actif: boolean;
  last_sent_at: string | null;
}

const rand = (n = 5) => Math.random().toString(36).slice(2, 2 + n);
const safeName = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60);

export const MAX_CV_SIZE = 5 * 1024 * 1024;
export const CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ---- Authentification ----
export const candidateAuth = {
  async signUp(email: string, password: string, nomComplet: string, visibleRecruteurs = true) {
    // Meme precaution que cote entreprise : `signUp` avec une session ouverte
    // ne cree pas de compte, il renvoie l'utilisateur courant — et le profil
    // se greffe alors sur le mauvais compte.
    await supabaseOffers.auth.signOut();

    const { data, error } = await supabaseOffers.auth.signUp({ email, password });
    if (error) {
      if (!/registered|already/i.test(error.message || '')) throw error;
      throw new EmailAlreadyRegisteredError();
    }

    const userId = data.user?.id;
    if (!userId) throw new Error("La création du compte a échoué.");
    if ((data.user?.email || '').toLowerCase() !== email.trim().toLowerCase()) {
      await supabaseOffers.auth.signOut();
      throw new Error("La création du compte a échoué (session existante).");
    }

    const { error: insErr } = await supabaseOffers.from('candidats').insert({
      id: userId,
      email: email.trim(),
      nom_complet: nomComplet.trim(),
      visible_recruteurs: visibleRecruteurs,
    });
    if (insErr) throw insErr;

    // Le candidat reste connecte : aucune validation admin a attendre.
    return userId;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabaseOffers.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signInWithGoogle() {
    const redirectTo = `${window.location.origin}/espace-candidat`;
    const { error } = await supabaseOffers.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  },

  async signOut() {
    await supabaseOffers.auth.signOut();
  },

  async changePassword(newPassword: string) {
    const { error } = await supabaseOffers.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async currentUser() {
    const { data } = await supabaseOffers.auth.getUser();
    return data.user || null;
  },
};

// ---- Profil ----
export const candidateService = {
  async getProfile(userId: string): Promise<CandidateProfile | null> {
    const { data, error } = await supabaseOffers
      .from('candidats').select('*').eq('id', userId).maybeSingle();
    if (error) { console.error('candidat.getProfile', error); return null; }
    return data as CandidateProfile | null;
  },

  // Cree le profil d'un compte deja authentifie (connexion Google).
  async createProfile(userId: string, email: string, nomComplet: string) {
    const { error } = await supabaseOffers.from('candidats').insert({
      id: userId, email, nom_complet: nomComplet || email.split('@')[0],
    });
    if (error) throw error;
  },

  async updateProfile(userId: string, patch: CandidateProfilePatch) {
    const { error } = await supabaseOffers.from('candidats').update(patch).eq('id', userId);
    if (error) throw error;
  },

  // Le CV vit dans le bucket prive `cvs`, sous `candidat/{uid}/` : ce prefixe
  // est celui qu'autorisent les policies de la migration 022, et il ne peut
  // entrer en collision avec les CV de candidature (ranges par `ref_offre`).
  async uploadCv(userId: string, file: File, previousPath?: string | null): Promise<{ path: string; name: string }> {
    if (!CV_TYPES.includes(file.type)) throw new Error('FORMAT');
    if (file.size > MAX_CV_SIZE) throw new Error('SIZE');

    const path = `candidat/${userId}/${Date.now()}-${rand()}-${safeName(file.name)}`;
    const { error } = await supabaseOffers.storage.from('cvs').upload(path, file, {
      contentType: file.type, upsert: false,
    });
    if (error) throw error;

    // Le CV precedent n'est plus reference par personne : sans ce menage, chaque
    // remplacement laisserait un fichier orphelin dans le bucket. On ne touche
    // QUE les fichiers du dossier personnel : un CV depose sur une offre reste
    // rattache a sa candidature et ne doit jamais partir.
    if (previousPath && previousPath !== path && previousPath.startsWith(`candidat/${userId}/`)) {
      await supabaseOffers.storage.from('cvs').remove([previousPath]);
    }
    return { path, name: file.name };
  },

  async cvUrl(path: string): Promise<string | null> {
    const { data, error } = await supabaseOffers.storage.from('cvs').createSignedUrl(path, 120);
    if (error) { console.error('candidat.cvUrl', error); return null; }
    return data?.signedUrl || null;
  },

  // Analyse le CV dans le navigateur (pdf.js / mammoth, aucun LLM ni envoi
  // serveur) pour pre-remplir le profil. Import dynamique : le parseur n'entre
  // pas dans le bundle des pages publiques.
  async parseCv(file: File): Promise<{ parsed: ParsedCv; supported: boolean } | null> {
    try {
      const { parseCvFile } = await import('./cvParser');
      return await parseCvFile(file);
    } catch (e) {
      console.error('candidat.parseCv', e);
      return null;
    }
  },

  // Historique des candidatures. Le rapprochement se fait par email cote RLS
  // (migration 022) : les candidatures deposees AVANT la creation du compte
  // remontent donc aussi, ce qui evite de repartir d'un espace vide.
  async getMyCandidatures(email: string): Promise<MyCandidature[]> {
    const { data, error } = await supabaseOffers
      .from('candidatures')
      .select('id,created_at,job_ref,job_title,company_name,status,cv_filename')
      .ilike('candidate_email', email)
      .order('created_at', { ascending: false });
    if (error) { console.error('candidat.getMyCandidatures', error); return []; }

    const rows = (data || []) as MyCandidature[];
    const refs = Array.from(new Set(rows.map((r) => r.job_ref).filter(Boolean)));
    if (refs.length === 0) return rows;

    // Le slug permet de renvoyer vers l'offre quand elle est encore publiee.
    const { data: offers } = await supabaseOffers
      .from('job_offers').select('ref_offre,slug').in('ref_offre', refs);
    const bySlug = new Map((offers || []).map((o: any) => [o.ref_offre, o.slug]));
    return rows.map((r) => ({ ...r, slug: bySlug.get(r.job_ref) || null }));
  },

  // A-t-il deja postule a cette offre ? Evite les doublons involontaires.
  async hasApplied(email: string, jobRef: string): Promise<boolean> {
    const { data, error } = await supabaseOffers
      .from('candidatures').select('id').ilike('candidate_email', email).eq('job_ref', jobRef).limit(1);
    if (error) return false;
    return (data || []).length > 0;
  },
};

// ---- Alertes emploi ----
export const alertsService = {
  async list(candidatId: string): Promise<JobAlert[]> {
    const { data, error } = await supabaseOffers
      .from('job_alerts').select('*').eq('candidat_id', candidatId)
      .order('created_at', { ascending: false });
    if (error) { console.error('alerts.list', error); return []; }
    return (data || []) as JobAlert[];
  },

  // `email` n'est volontairement pas transmis : le trigger `job_alerts_guard`
  // le repose depuis le profil. Sinon la plateforme deviendrait un relais
  // permettant de faire envoyer des emails a une adresse tierce.
  async create(candidatId: string, alert: Pick<JobAlert, 'intitule' | 'ville' | 'type_contrat' | 'frequence'>) {
    const { error } = await supabaseOffers.from('job_alerts').insert({
      candidat_id: candidatId,
      email: '',
      intitule: alert.intitule || null,
      ville: alert.ville || null,
      type_contrat: alert.type_contrat || null,
      frequence: alert.frequence,
    });
    if (error) throw error;
  },

  async setActive(id: string, actif: boolean) {
    const { error } = await supabaseOffers.from('job_alerts').update({ actif }).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabaseOffers.from('job_alerts').delete().eq('id', id);
    if (error) throw error;
  },
};
