import { supabaseOffers } from './supabase';

// Prospection entreprises : cibles à contacter + envoi via Brevo (admin only).
export interface OutreachTarget {
  id: string;
  created_at: string;
  raison_sociale: string;
  slug: string;
  ville: string | null;
  nb_offres: number;
  postes: number;
  email: string | null;
  statut: 'a_contacter' | 'contacte' | 'inscrit' | 'ignore';
  date_contact: string | null;
  notes: string | null;
}

export const OUTREACH_STATUTS: { value: OutreachTarget['statut']; label: string; color: string }[] = [
  { value: 'a_contacter', label: 'À contacter', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacte', label: 'Contacté', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'inscrit', label: 'Inscrit', color: 'bg-green-100 text-green-800' },
  { value: 'ignore', label: 'Ignoré', color: 'bg-gray-100 text-gray-600' },
];

const SELECT = 'id,created_at,raison_sociale,slug,ville,nb_offres,postes,email,statut,date_contact,notes';

export const outreachService = {
  async list(): Promise<OutreachTarget[]> {
    const { data, error } = await supabaseOffers
      .from('outreach_targets')
      .select(SELECT)
      .order('postes', { ascending: false })
      .order('nb_offres', { ascending: false });
    if (error) { console.error('outreach.list', error); return []; }
    return (data || []) as OutreachTarget[];
  },

  async update(id: string, patch: Partial<OutreachTarget>): Promise<boolean> {
    const { error } = await supabaseOffers.from('outreach_targets').update(patch).eq('id', id);
    if (error) { console.error('outreach.update', error); return false; }
    return true;
  },

  // Import en masse d'emails : lignes "Entreprise;email" ou "Entreprise,email"
  // Rapproche sur le nom (insensible casse/accents). Retourne le nb d'emails posés.
  async importEmails(text: string, targets: OutreachTarget[]): Promise<number> {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const byName = new Map(targets.map(t => [norm(t.raison_sociale), t]));
    let n = 0;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.split(/[;,\t]/);
      if (m.length < 2) continue;
      const name = m[0].trim();
      const email = m[m.length - 1].trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
      const t = byName.get(norm(name));
      if (t) { if (await this.update(t.id, { email })) n++; }
    }
    return n;
  },

  // Envoi via l'endpoint serverless (Brevo). Renvoie le détail par cible.
  async send(
    targets: { id: string; email: string; raison_sociale: string; slug: string; ville: string | null }[],
    subject: string,
    htmlTemplate: string,
  ): Promise<{ ok: boolean; error?: string; results?: { id: string; ok: boolean; error?: string }[] }> {
    const { data: sess } = await supabaseOffers.auth.getSession();
    const accessToken = sess?.session?.access_token;
    if (!accessToken) return { ok: false, error: 'Session admin expirée, reconnectez-vous.' };

    const res = await fetch('/api/send-outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, targets, subject, htmlTemplate }),
    });
    let body: any = {};
    try { body = await res.json(); } catch { /* noop */ }
    if (!res.ok) return { ok: false, error: body?.error || `Erreur ${res.status}`, results: body?.results };

    // Marque « contacté » les envois réussis
    const okIds = (body.results || []).filter((r: any) => r.ok).map((r: any) => r.id);
    if (okIds.length) {
      await supabaseOffers.from('outreach_targets')
        .update({ statut: 'contacte', date_contact: new Date().toISOString() })
        .in('id', okIds);
    }
    return { ok: true, results: body.results };
  },
};
