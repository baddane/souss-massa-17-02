import { supabaseOffers } from './supabase';
import type { ChartSpec } from '../../components/ObsChart';

export type ObsCategorie = 'chomage' | 'actualite' | 'strategie' | 'veille';

export interface ObsArticle {
  id: string;
  created_at: string;
  slug: string;
  titre: string;
  categorie: ObsCategorie;
  chapo: string | null;
  contenu: string | null;
  charts: ChartSpec[];
  cover_emoji: string | null;
  meta_title: string | null;
  meta_description: string | null;
  seo_keywords: string[] | null;
  sources: string[] | null;
  date_publi: string;
  temps_lecture: number | null;
  auteur: string | null;
  statut: string;
}

export const OBS_CATEGORIES: { value: ObsCategorie; label: string; emoji: string }[] = [
  { value: 'chomage', label: 'Chômage & statistiques', emoji: '📊' },
  { value: 'actualite', label: "Actualité de l'emploi", emoji: '📰' },
  { value: 'strategie', label: 'Stratégie régionale', emoji: '🎯' },
  { value: 'veille', label: 'Veille emploi', emoji: '🔎' },
];

export const obsCategorieLabel = (c: string) =>
  OBS_CATEGORIES.find(x => x.value === c)?.label || c;
export const obsCategorieEmoji = (c: string) =>
  OBS_CATEGORIES.find(x => x.value === c)?.emoji || '📄';

const SELECT = 'id,created_at,slug,titre,categorie,chapo,contenu,charts,cover_emoji,meta_title,meta_description,seo_keywords,sources,date_publi,temps_lecture,auteur,statut';

export const observatoireService = {
  async list(categorie?: ObsCategorie): Promise<ObsArticle[]> {
    let q = supabaseOffers
      .from('observatoire_articles')
      .select(SELECT)
      .eq('statut', 'publie')
      .order('date_publi', { ascending: false })
      .order('created_at', { ascending: false });
    if (categorie) q = q.eq('categorie', categorie);
    const { data, error } = await q;
    if (error) { console.error('observatoire.list', error); return []; }
    return (data || []) as ObsArticle[];
  },

  async getBySlug(slug: string): Promise<ObsArticle | null> {
    const { data, error } = await supabaseOffers
      .from('observatoire_articles')
      .select(SELECT)
      .eq('slug', slug)
      .eq('statut', 'publie')
      .maybeSingle();
    if (error) { console.error('observatoire.getBySlug', error); return null; }
    return (data as ObsArticle) || null;
  },

  // ---- Admin (RLS is_admin) : voit brouillons + publiés, CRUD complet ----
  async adminList(): Promise<ObsArticle[]> {
    const { data, error } = await supabaseOffers
      .from('observatoire_articles')
      .select(SELECT)
      .order('date_publi', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) { console.error('observatoire.adminList', error); return []; }
    return (data || []) as ObsArticle[];
  },

  async create(record: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabaseOffers.from('observatoire_articles').insert(record);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  async update(id: string, patch: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabaseOffers.from('observatoire_articles').update(patch).eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabaseOffers.from('observatoire_articles').delete().eq('id', id);
    if (error) { console.error('observatoire.remove', error); return false; }
    return true;
  },
};
