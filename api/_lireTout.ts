// Lecture REST COMPLETE (cote serveur), page par page.
//
// PostgREST renvoie au plus 1 000 lignes par requete (« Max rows » du projet
// Supabase) et tronque SANS erreur. Toute lecture qui peut depasser 1 000
// lignes (candidatures, offres, CVtheque) doit passer par ici.
// Prefixe « _ » : module interne, pas une route Vercel.
//
// `url` doit porter un `order=` stable (terminer par `,id.asc` quand c'est
// possible), sinon deux pages peuvent se chevaucher.

const TAILLE = 1000;

export async function lireTout<T = any>(url: string, headers: Record<string, string>): Promise<T[]> {
  const toutes: T[] = [];
  const sep = url.includes('?') ? '&' : '?';
  for (let n = 0; n < 200; n++) {
    const r = await fetch(`${url}${sep}limit=${TAILLE}&offset=${n * TAILLE}`, { headers });
    if (!r.ok) throw new Error(`Lecture Supabase impossible (HTTP ${r.status})`);
    const lignes = (await r.json()) as T[];
    if (!Array.isArray(lignes)) throw new Error('Reponse Supabase inattendue');
    toutes.push(...lignes);
    if (lignes.length < TAILLE) break;
  }
  return toutes;
}
