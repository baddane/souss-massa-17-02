// Lecture COMPLETE d'une table, page par page.
//
// L'API Supabase (PostgREST) renvoie au plus 1 000 lignes par requete
// (reglage « Max rows » du projet). Sans pagination, une liste s'arrete net a
// 1 000 SANS AUCUNE ERREUR : c'est ce qui a fige le compteur « Candidatures »
// de l'admin a 1 000 le 24/11/2026, alors que la base en contenait 1 074.
//
// Usage : on passe une fonction qui construit la requete pour une tranche
// [debut, fin]. La requete doit avoir un ordre STABLE (ajouter `.order('id')`
// en dernier critere), sinon deux pages peuvent se chevaucher.
//
//   const { data, error } = await toutesLesLignes((debut, fin) =>
//     supabaseOffers.from('candidatures').select('*')
//       .order('created_at', { ascending: false }).order('id')
//       .range(debut, fin));

export const TAILLE_PAGE = 1000;

type Page<T> = PromiseLike<{ data: T[] | null; error: any }>;

export async function toutesLesLignes<T = any>(
  page: (debut: number, fin: number) => Page<T>,
  taille = TAILLE_PAGE,
): Promise<{ data: T[]; error: any }> {
  const toutes: T[] = [];
  // Garde-fou : 200 pages = 200 000 lignes, bien au-dela de tout usage reel.
  for (let n = 0; n < 200; n++) {
    const debut = n * taille;
    const { data, error } = await page(debut, debut + taille - 1);
    if (error) return { data: toutes, error };
    const lignes = data || [];
    toutes.push(...lignes);
    if (lignes.length < taille) break;
  }
  return { data: toutes, error: null };
}
