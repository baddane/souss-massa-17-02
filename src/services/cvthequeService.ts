import { supabaseOffers } from './supabase';
import { parseCvFile, ParsedCv } from './cvParser';

const BUCKET = 'cvtheque';

export interface CvthequeRow extends ParsedCv {
  id: string;
  created_at: string;
  file_path: string;
  file_name: string | null;
  file_type: string | null;
  notes: string | null;
  source: string;   // 'upload' (importé) | 'candidature' (postulant)
  bucket: string;    // 'cvtheque' | 'cvs'
}

export interface CvthequeFilters {
  q?: string;            // recherche plein-texte
  ville?: string;
  poste?: string;
  diplome?: string;
  niveau?: string;
  competence?: string;
  minExperience?: number;
}

const rand = (n = 5) => Math.random().toString(36).slice(2, 2 + n);
const safeName = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60);

export const cvthequeService = {
  // Upload le fichier dans le bucket privé + parse (script) + insert la fiche
  async uploadAndParse(file: File): Promise<{ row: CvthequeRow | null; supported: boolean; error?: string }> {
    const path = `${Date.now()}-${rand()}-${safeName(file.name)}`;

    const { error: upErr } = await supabaseOffers.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (upErr) return { row: null, supported: false, error: upErr.message };

    let parsed: ParsedCv;
    let supported = false;
    try {
      const res = await parseCvFile(file);
      parsed = res.parsed;
      supported = res.supported;
    } catch (e: any) {
      // Le parsing a échoué : on garde quand même le fichier, fiche vide éditable
      parsed = {
        nom_complet: '', email: '', telephone: '', ville: '', quartier: '', poste: '',
        diplome: '', niveau_etudes: '', competences: [], langues: [],
        experience_years: null, experience_resume: '', keywords: [], raw_text: '',
      };
    }

    const insert = {
      file_path: path,
      file_name: file.name,
      file_type: file.type || null,
      source: 'upload',
      bucket: BUCKET,
      nom_complet: parsed.nom_complet || null,
      email: parsed.email || null,
      telephone: parsed.telephone || null,
      ville: parsed.ville || null,
      quartier: parsed.quartier || null,
      poste: parsed.poste || null,
      diplome: parsed.diplome || null,
      niveau_etudes: parsed.niveau_etudes || null,
      competences: parsed.competences || [],
      langues: parsed.langues || [],
      experience_years: parsed.experience_years,
      experience_resume: parsed.experience_resume || null,
      keywords: parsed.keywords || [],
      raw_text: parsed.raw_text || null,
    };

    const { data, error } = await supabaseOffers.from('cvtheque').insert(insert).select('*').single();
    if (error) {
      // Rollback du fichier uploadé pour ne pas laisser d'orphelin
      await supabaseOffers.storage.from(BUCKET).remove([path]);
      return { row: null, supported, error: error.message };
    }
    return { row: data as CvthequeRow, supported };
  },

  // Recherche dynamique
  async search(filters: CvthequeFilters = {}): Promise<CvthequeRow[]> {
    let query = supabaseOffers.from('cvtheque').select('*').order('created_at', { ascending: false });

    if (filters.q && filters.q.trim()) {
      query = query.textSearch('search_tsv', filters.q.trim(), { type: 'websearch', config: 'french' });
    }
    if (filters.ville) query = query.ilike('ville', `%${filters.ville}%`);
    if (filters.poste) query = query.ilike('poste', `%${filters.poste}%`);
    if (filters.diplome) query = query.ilike('diplome', `%${filters.diplome}%`);
    if (filters.niveau) query = query.ilike('niveau_etudes', `%${filters.niveau}%`);
    if (filters.competence) query = query.contains('competences', [filters.competence]);
    if (typeof filters.minExperience === 'number' && !isNaN(filters.minExperience)) {
      query = query.gte('experience_years', filters.minExperience);
    }

    const { data, error } = await query;
    if (error) { console.error('cvtheque.search', error); return []; }
    return (data || []) as CvthequeRow[];
  },

  // Fiches sans donnees structurees : celles creees par le trigger de
  // synchronisation des candidatures, qui recopie seulement nom / poste / email
  // / telephone sans jamais lire le CV. Sans rattrapage, les filtres ville,
  // niveau, diplome et competences ne servent a rien sur ces profils.
  async unparsed(): Promise<CvthequeRow[]> {
    const { data, error } = await supabaseOffers
      .from('cvtheque')
      .select('*')
      .is('raw_text', null)
      .not('file_path', 'is', null);
    if (error) { console.error('cvtheque.unparsed', error); return []; }
    return (data || []) as CvthequeRow[];
  },

  // Telecharge le CV, l'analyse dans le navigateur (pdf.js / mammoth, aucun LLM)
  // et complete la fiche. Ne remplace jamais une valeur deja saisie a la main.
  async parseExisting(row: CvthequeRow): Promise<{ ok: boolean; supported: boolean; error?: string }> {
    try {
      const url = await this.signedUrl(row.file_path, row.bucket);
      if (!url) return { ok: false, supported: false, error: 'URL signée indisponible' };

      const res = await fetch(url);
      if (!res.ok) return { ok: false, supported: false, error: `Téléchargement ${res.status}` };
      const blob = await res.blob();
      const file = new File([blob], row.file_name || 'cv.pdf', { type: blob.type });

      const { parsed, supported } = await parseCvFile(file);
      if (!supported) return { ok: false, supported: false };

      const patch: Partial<CvthequeRow> = {
        ville: row.ville || parsed.ville || null,
        quartier: row.quartier || parsed.quartier || null,
        diplome: row.diplome || parsed.diplome || null,
        niveau_etudes: row.niveau_etudes || parsed.niveau_etudes || null,
        competences: (row.competences?.length ? row.competences : parsed.competences) || [],
        langues: (row.langues?.length ? row.langues : parsed.langues) || [],
        experience_years: row.experience_years ?? parsed.experience_years,
        experience_resume: row.experience_resume || parsed.experience_resume || null,
        keywords: (row.keywords?.length ? row.keywords : parsed.keywords) || [],
        raw_text: parsed.raw_text || null,
        file_type: row.file_type || file.type || null,
      } as Partial<CvthequeRow>;

      const ok = await this.update(row.id, patch);
      return { ok, supported: true };
    } catch (e: any) {
      return { ok: false, supported: false, error: String(e?.message || e) };
    }
  },

  async signedUrl(path: string, bucket: string = BUCKET): Promise<string | null> {
    const { data, error } = await supabaseOffers.storage.from(bucket).createSignedUrl(path, 120);
    if (error || !data) return null;
    return data.signedUrl;
  },

  async update(id: string, patch: Partial<CvthequeRow>): Promise<boolean> {
    const { error } = await supabaseOffers.from('cvtheque').update(patch).eq('id', id);
    if (error) { console.error('cvtheque.update', error); return false; }
    return true;
  },

  async remove(id: string, path: string, bucket: string = BUCKET): Promise<boolean> {
    const { error } = await supabaseOffers.from('cvtheque').delete().eq('id', id);
    if (error) { console.error('cvtheque.remove', error); return false; }
    // On ne supprime le fichier QUE s'il appartient au bucket CVthèque.
    // Un CV de postulant (bucket 'cvs') ne doit jamais être supprimé ici : il
    // reste rattaché à sa candidature.
    if (bucket === BUCKET) {
      await supabaseOffers.storage.from(BUCKET).remove([path]);
    }
    return true;
  },
};
