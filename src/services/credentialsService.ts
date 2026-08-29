import { supabaseOffers } from './supabase';

// Comptes entreprise provisionnes par la plateforme, avec leurs identifiants.
//
// Toute operation qui touche a l'IDENTIFIANT ou au MOT DE PASSE passe par
// `api/provision-companies` : ces valeurs vivent dans Supabase Auth, qu'on ne
// peut modifier qu'avec la cle `service_role`, cote serveur. Un simple UPDATE
// sur la table ferait diverger la liste et la realite — l'admin lirait un mot de
// passe qui ne fonctionne pas.
// Seuls la note et la date d'envoi, purement descriptives, s'ecrivent en direct.

export interface CompanyCredential {
  company_id: string;
  email: string;
  mot_de_passe: string;
  email_fictif: boolean;
  origine: string;
  note: string | null;
  envoye_le: string | null;
  created_at: string;
  updated_at: string;
  nom_entreprise?: string;
  ville?: string | null;
  telephone?: string | null;
  secteur?: string | null;
  statut?: string;
  offres?: number;
}

// Champs de la fiche entreprise que cet ecran peut corriger en direct.
//
// `email` et `statut` en sont volontairement absents, et LA LISTE EST LE SEUL
// GARDE-FOU : verifie en base, le trigger `ce_protect_moderation_fields` exempte
// explicitement l'admin, donc un UPDATE admin sur ces colonnes PASSE. Ne pas
// compter sur lui ici.
//   - `email` vit dans Supabase Auth. L'ecrire en direct afficherait a l'admin
//     un identifiant avec lequel l'entreprise ne peut pas se connecter :
//     il passe par `setEmail`, qui met Auth et les deux tables d'accord.
//   - `statut` est une decision de moderation, qui a son propre onglet. Le
//     glisser dans un formulaire de correction de fiche le ferait basculer par
//     inadvertance.
export interface ProfilPatch {
  nom_entreprise?: string;
  ville?: string | null;
  telephone?: string | null;
  secteur?: string | null;
}

async function adminFetch(payload: Record<string, unknown>) {
  const { data: { session } } = await supabaseOffers.auth.getSession();
  const res = await fetch('/api/provision-companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any).error || `Échec (${res.status})`);
  return body as any;
}

export const credentialsService = {
  async list(): Promise<CompanyCredential[]> {
    const { data, error } = await supabaseOffers
      .from('company_credentials')
      .select('*, comptes_entreprise(nom_entreprise,ville,telephone,secteur,statut)')
      .order('created_at', { ascending: false });
    if (error) { console.error('credentials.list', error); return []; }

    // Nombre d'offres rattachees a chaque compte : compte a part, PostgREST ne
    // sachant pas agreger sur une relation inverse sans vue dediee.
    const { data: offres } = await supabaseOffers
      .from('job_offers').select('company_id').not('company_id', 'is', null);
    const parCompte = new Map<string, number>();
    for (const o of (offres || []) as any[]) {
      parCompte.set(o.company_id, (parCompte.get(o.company_id) || 0) + 1);
    }

    return ((data || []) as any[]).map((r) => ({
      ...r,
      nom_entreprise: r.comptes_entreprise?.nom_entreprise,
      ville: r.comptes_entreprise?.ville ?? null,
      telephone: r.comptes_entreprise?.telephone ?? null,
      secteur: r.comptes_entreprise?.secteur ?? null,
      statut: r.comptes_entreprise?.statut,
      offres: parCompte.get(r.company_id) || 0,
    }));
  },

  // Entreprises qui ont des offres en ligne mais pas encore de compte.
  async pending(): Promise<{ raison_sociale: string; offres: number; ville: string | null }[]> {
    const { data, error } = await supabaseOffers
      .from('job_offers')
      .select('raison_sociale,ville')
      .is('company_id', null)
      .eq('statut', 'active');
    if (error) { console.error('credentials.pending', error); return []; }
    const map = new Map<string, { raison_sociale: string; offres: number; ville: string | null }>();
    for (const o of (data || []) as any[]) {
      const nom = (o.raison_sociale || '').trim();
      if (!nom) continue;
      const cur = map.get(nom) || { raison_sociale: nom, offres: 0, ville: o.ville || null };
      cur.offres += 1;
      map.set(nom, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.offres - a.offres);
  },

  provisionAll: () => adminFetch({ mode: 'auto' }),

  provisionOne: (p: { raison_sociale: string; email: string; ville?: string; secteur?: string }) =>
    adminFetch({ mode: 'one', ...p }),

  setPassword: (companyId: string, email: string, motDePasse?: string) =>
    adminFetch({ mode: 'password', company_id: companyId, email, mot_de_passe: motDePasse }),

  setEmail: (companyId: string, email: string) =>
    adminFetch({ mode: 'email', company_id: companyId, email }),

  // Correction de la fiche entreprise par l'admin (policy `ce_update`).
  // Le nom compte double : c'est sur lui que le trigger `job_offers_auto_claim`
  // rattache les offres importees. Le corriger, c'est aussi reparer les
  // rattachements a venir.
  async updateProfil(companyId: string, patch: ProfilPatch) {
    const net: Record<string, unknown> = {};
    for (const cle of ['nom_entreprise', 'ville', 'telephone', 'secteur'] as const) {
      if (patch[cle] !== undefined) {
        const v = patch[cle];
        net[cle] = typeof v === 'string' ? (v.trim() || null) : v;
      }
    }
    if (net.nom_entreprise === null) throw new Error('La raison sociale ne peut pas être vide');
    if (Object.keys(net).length === 0) return;
    const { error } = await supabaseOffers
      .from('comptes_entreprise').update(net).eq('id', companyId);
    if (error) throw error;
  },

  // Offres actives sans proprietaire portant exactement ce nom : ce que le
  // renommage rendra rattachable.
  async offresOrphelinesPourNom(nom: string): Promise<number> {
    const { count, error } = await supabaseOffers
      .from('job_offers')
      .select('id', { count: 'exact', head: true })
      .is('company_id', null).eq('statut', 'active').ilike('raison_sociale', nom.trim());
    if (error) return 0;
    return count || 0;
  },

  async setNote(companyId: string, note: string) {
    const { error } = await supabaseOffers
      .from('company_credentials').update({ note }).eq('company_id', companyId);
    if (error) throw error;
  },

  async markSent(companyId: string) {
    const { error } = await supabaseOffers
      .from('company_credentials').update({ envoye_le: new Date().toISOString() }).eq('company_id', companyId);
    if (error) throw error;
  },
};
