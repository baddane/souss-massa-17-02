import type { ObsArticle } from './observatoireService';
import { AUTEUR } from '../config/author';

// Fabrique l'extrait LinkedIn d'un article de l'Observatoire.
//
// POURQUOI UN EXTRAIT ET NON L'ARTICLE ENTIER : republier le texte integral met
// le site en concurrence avec lui-meme. LinkedIn a une autorite de domaine bien
// superieure a celle de soussmassa-rh.com ; sur « chomage des jeunes
// Souss-Massa », c'est la version LinkedIn qui remonterait, et le site perdrait
// le trafic qui se convertit en candidatures et en comptes entreprise.
// L'extrait renvoie vers l'original, qui reste la source.
//
// Contraintes de la plateforme prises en compte :
//   - 3 000 caracteres maximum ;
//   - seuls les ~200 premiers sont visibles avant « …voir plus » : le titre et
//     le chiffre le plus parlant doivent y tenir ;
//   - 3 a 5 hashtags, au-dela l'effet s'inverse.

const SITE_URL = 'https://www.soussmassa-rh.com';
export const LINKEDIN_MAX = 3000;

const EMOJI_CATEGORIE: Record<string, string> = {
  chomage: '📉',
  actualite: '📰',
  strategie: '🎯',
  veille: '🔎',
};

// Hashtags toujours presents : ils definissent l'audience visee.
const HASHTAGS_BASE = ['EmploiMaroc', 'SoussMassa', 'Agadir'];

function enHashtag(mot: string): string {
  return mot
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .join('');
}

function couper(texte: string, max: number): string {
  const plat = (texte || '').replace(/\s+/g, ' ').trim();
  if (plat.length <= max) return plat;
  const coupe = plat.slice(0, max - 1);
  const espace = coupe.lastIndexOf(' ');
  return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd() + '…';
}

// Mise en forme francaise : virgule decimale, espace insecable fine avant le
// signe %, separateur de milliers. « 67.3% » est une ecriture anglophone — sous
// une signature d'expert, ca se voit.
function nombreFr(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
}

// L'unite « milliers » est une convention d'axe de graphique, pas de la prose :
// « 90 milliers » se dit « 90 000 ».
function valeurLisible(valeur: number, unite?: string): string {
  const u = (unite || '').trim();
  if (/millier/i.test(u)) return nombreFr(valeur * 1000);
  if (u === '%') return `${nombreFr(valeur)}\u202f%`;
  return u ? `${nombreFr(valeur)}${u.startsWith(' ') ? u : ' ' + u}` : nombreFr(valeur);
}

/**
 * Les chiffres les plus parlants d'un article, tires de ses diagrammes.
 *
 * Le traitement depend du type de diagramme, et ce n'est pas un detail :
 * sur une SERIE TEMPORELLE, retenir la valeur la plus haute revient a citer
 * l'annee la plus ancienne. Un article qui montre une baisse de 145 000 a
 * 120 000 se retrouverait resume par « 2017 : 145 000 » — l'inverse de son
 * propos. On en tire donc une evolution, pas un point.
 */
function chiffresCles(article: ObsArticle, max = 3): string[] {
  const out: string[] = [];
  for (const chart of article.charts || []) {
    if (!chart?.series?.length) continue;

    if (chart.type === 'line' && chart.series.length >= 2) {
      const debut = chart.series[0];
      const fin = chart.series[chart.series.length - 1];
      const sens = fin.value < debut.value ? '↘' : fin.value > debut.value ? '↗' : '→';
      out.push(
        `${debut.label} → ${fin.label} : ` +
        `${valeurLisible(debut.value, chart.unit)} ${sens} ${valeurLisible(fin.value, chart.unit)}`,
      );
    } else {
      // Barres et anneaux : la valeur la plus haute porte le message.
      const top = [...chart.series].sort((a, b) => b.value - a.value)[0];
      if (!top) continue;
      out.push(`${top.label} : ${valeurLisible(top.value, chart.unit)}`);
    }
    if (out.length >= max) break;
  }
  return out;
}

export function buildLinkedInPost(article: ObsArticle): string {
  const url = `${SITE_URL}/observatoire/${article.slug}`;
  const emoji = article.cover_emoji || EMOJI_CATEGORIE[article.categorie] || '📊';

  const hashtags = Array.from(new Set([
    ...HASHTAGS_BASE,
    ...(article.seo_keywords || []).slice(0, 2).map(enHashtag).filter((h) => h.length > 3),
  ])).slice(0, 5).map((h) => `#${h}`).join(' ');

  const chiffres = chiffresCles(article);
  const blocChiffres = chiffres.length
    ? `\n\nCe que disent les chiffres :\n${chiffres.map((c) => `• ${c}`).join('\n')}`
    : '';

  // Le chapo est raccourci pour que l'essentiel tienne avant le « voir plus ».
  const accroche = couper(article.chapo || article.meta_description || article.titre, 320);

  const post =
    `${emoji} ${article.titre}\n\n` +
    `${accroche}` +
    `${blocChiffres}\n\n` +
    `Analyse complète 👉 ${url}\n\n` +
    `${AUTEUR.titre}.\n\n` +
    `${hashtags}`;

  return post.length > LINKEDIN_MAX ? couper(post, LINKEDIN_MAX) : post;
}

/** Ouvre la fenetre de partage LinkedIn pour une URL donnee. */
export function lienPartageLinkedIn(slug: string): string {
  // LinkedIn ne pre-remplit plus le texte depuis une URL de partage : seul le
  // lien est transmis, le texte doit etre colle. D'ou le bouton « Copier ».
  const url = `${SITE_URL}/observatoire/${slug}`;
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}
