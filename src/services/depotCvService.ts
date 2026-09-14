import { supabaseOffers } from './supabase';

// Depot de CV spontane, depuis la page publique /deposer-mon-cv.
//
// VOLONTAIREMENT SEPARE de `cvthequeService` : celui-ci importe `cvParser` de
// maniere statique, donc pdf.js et mammoth (~830 ko). Les tirer dans une page
// publique alourdirait le bundle de tout le site pour une fonction qui ne sert
// qu'au moment de l'envoi. Ici l'analyse est en import DYNAMIQUE.
//
// La fiche est ecrite directement dans `cvtheque`, sans passer par
// `candidatures` : un CV depose hors offre n'est pas une candidature, et
// l'enregistrer comme telle fausserait le compteur de candidatures des offres
// et le tableau de bord des entreprises.

const BUCKET = 'cvs';
const PREFIXE = 'spontane';          // impose par la policy `cvtheque_depot_spontane`

export const TYPES_ACCEPTES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const TAILLE_MAX = 5 * 1024 * 1024;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface DepotCv {
  nom_complet: string;
  email: string;
  telephone: string;
  ville: string;
  poste: string;
  fichier: File;
}

const rand = (n = 5) => Math.random().toString(36).slice(2, 2 + n);
const nomSur = (nom: string) =>
  nom.normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60);

/**
 * Analyse le CV dans le navigateur pour pre-remplir competences, diplome et
 * texte plein — c'est ce qui rend la fiche trouvable par les recruteurs.
 *
 * BEST EFFORT : un CV scanne ou un vieux .doc ne donne rien, et ce n'est pas
 * une raison de refuser le depot. L'admin rattrape depuis « Analyser les CV non
 * traites ». On ne bloque donc jamais l'envoi sur cette etape.
 */
async function analyser(fichier: File) {
  try {
    const { parseCvFile } = await import('./cvParser');
    const { parsed } = await parseCvFile(fichier);
    return parsed;
  } catch {
    return null;
  }
}

export const depotCvService = {
  /**
   * Renvoie toujours un succes du point de vue de la personne.
   *
   * `doublon` n'est PAS remonte comme un echec, et l'interface affiche le meme
   * message dans les deux cas : dire « vous etes deja enregistre » a qui saisit
   * l'adresse d'un tiers revelerait la presence de cette adresse dans la base.
   */
  async deposer(d: DepotCv): Promise<{ ok: boolean; doublon: boolean; erreur?: string }> {
    const chemin = `${PREFIXE}/${Date.now()}-${rand()}-${nomSur(d.fichier.name)}`;

    const { error: errUpload } = await supabaseOffers.storage
      .from(BUCKET).upload(chemin, d.fichier, {
        contentType: d.fichier.type || 'application/octet-stream',
        upsert: false,
      });
    if (errUpload) return { ok: false, doublon: false, erreur: errUpload.message };

    const analyse = await analyser(d.fichier);

    // APPEL D'UNE FONCTION, ET NON UN INSERT DIRECT.
    //
    // Le client Supabase envoie `Prefer: return=representation` sur un insert :
    // PostgREST fait alors `INSERT … RETURNING`, et Postgres applique au
    // RETURNING la politique de LECTURE. Un visiteur anonyme n'en a aucune sur
    // `cvtheque` — et ne doit pas en avoir, la CVtheque n'etant lisible que
    // depuis l'espace d'une entreprise validee. L'insertion etait donc refusee
    // alors que la ligne etait conforme (verifie au navigateur).
    //
    // `deposer_cv` (migration 036) contourne cela proprement : elle ne renvoie
    // que « cree » ou « doublon », jamais de donnees, et pose elle-meme les
    // colonnes de controle — le formulaire ne peut plus les soumettre.
    const { data, error } = await supabaseOffers.rpc('deposer_cv', {
      p_nom: d.nom_complet.trim(),
      p_email: d.email.trim().toLowerCase(),
      p_telephone: d.telephone.trim(),
      // La ville et le poste saisis priment sur l'extraction automatique :
      // la personne sait mieux que la regex ce qu'elle cherche.
      p_ville: d.ville.trim() || analyse?.ville || '',
      p_poste: d.poste.trim() || analyse?.poste || '',
      p_file_path: chemin,
      p_file_name: d.fichier.name,
      p_file_type: d.fichier.type || null,
      p_diplome: analyse?.diplome || null,
      p_niveau: analyse?.niveau_etudes || null,
      p_competences: analyse?.competences || [],
      p_langues: analyse?.langues || [],
      p_keywords: analyse?.keywords || [],
      p_raw_text: analyse?.raw_text || null,
    });

    if (error) {
      await supabaseOffers.storage.from(BUCKET).remove([chemin]);
      return { ok: false, doublon: false, erreur: error.message };
    }
    if (data === 'doublon') {
      // Deja present : le fichier vient d'etre televerse pour rien, on le
      // retire pour ne pas faire grossir le stockage d'une copie invisible.
      await supabaseOffers.storage.from(BUCKET).remove([chemin]);
      return { ok: true, doublon: true };
    }
    return { ok: true, doublon: false };
  },
};
