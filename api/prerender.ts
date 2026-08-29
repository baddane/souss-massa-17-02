export const config = { runtime: 'edge' };

// Pre-rendu des balises <head> pour les pages profondes du SPA.
//
// PROBLEME RESOLU : le site est une application React rendue dans le navigateur.
// Le HTML servi par Vercel est toujours le meme `index.html` — meme <title>,
// meme description, et surtout meme `<link rel="canonical">` pointant vers la
// page d'accueil. Les 440+ offres et les articles de l'Observatoire etaient donc
// tous annonces a Google comme etant la page d'accueil, et les robots sociaux
// (Facebook, LinkedIn, WhatsApp, Twitter), qui n'executent AUCUN JavaScript,
// ne voyaient jamais le titre reel de l'offre partagee.
//
// PRINCIPE : cette fonction sert le MEME index.html que d'habitude — meme
// bundle, meme CSS, meme application — en remplacant uniquement les balises du
// <head> et en ajoutant le JSON-LD. Le <body> n'est pas touche : aucun risque
// de decalage visuel, React se comporte exactement comme avant. Un bloc
// <noscript> porte le contenu textuel pour les robots qui n'executent pas JS.
//
// SECURITE DE REPLI : a la moindre anomalie (Supabase injoignable, index.html
// illisible), on renvoie l'index.html d'origine tel quel. Le pire cas est donc
// le comportement actuel, jamais une page cassee.

const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';
const SITE_URL = 'https://www.soussmassa-rh.com';
const SITE_NAME = 'SoussMassa-RH';

// Signature des articles de l'Observatoire.
//
// Volontairement recopie de `src/config/author.ts` plutot qu'importe : les
// modules de `api/` sont resolus a L'EXECUTION, pas bundles — un import vers
// `../src/` echouerait en production (c'est l'incident ERR_MODULE_NOT_FOUND
// qui avait casse les envois d'emails). Les deux valeurs doivent rester
// synchronisees ; c'est signale dans OBSERVATOIRE.md.
const AUTEUR_NOM = 'Rachid Baddane';
const AUTEUR_TITRE = 'Expert en emploi';
const AUTEUR_LINKEDIN = '';   // vide = aucun lien publie

interface Meta {
  title: string;
  description: string;
  canonical: string;
  type: string;
  jsonLd?: Record<string, unknown>;
  body?: string;
  found: boolean;
  degraded?: boolean;   // Supabase n'a pas repondu : on ne conclut pas a un 404
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

// Coupe proprement a la limite d'un mot (les meta descriptions tronquees en
// plein mot sont reecrites par Google).
function clamp(text: string, max: number): string {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

const CONTRACT_SCHEMA: Record<string, string> = {
  CDI: 'FULL_TIME',
  CDD: 'TEMPORARY',
  Stage: 'INTERN',
  Alternance: 'INTERN',
  Freelance: 'CONTRACTOR',
};

async function sbGet(path: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

// --- Offre d'emploi -------------------------------------------------------
async function offerMeta(slug: string): Promise<Meta> {
  const rows = await sbGet(
    `job_offers?select=*&statut=eq.active&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  if (rows === null) return { ...emptyMeta(), degraded: true };
  const o = rows[0];
  if (!o) return emptyMeta();

  const title = `${o.emploi_metier} - ${o.ville}`;
  const description = o.meta_description
    ? clamp(o.meta_description, 158)
    : clamp(
        `${o.emploi_metier} à ${o.ville} - ${o.type_contrat} chez ${o.raison_sociale}. ` +
        `${o.nbre_postes > 1 ? `${o.nbre_postes} postes à pourvoir. ` : ''}Postulez en ligne sur ${SITE_NAME}.`,
        158,
      );

  // JobPosting complet : `validThrough` et `identifier` manquaient, et Google
  // for Jobs deprecie les offres sans date de fin explicite.
  const posted = String(o.date_offre || '').slice(0, 10);
  const through = validThrough(posted);
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description: o.full_description || o.meta_description || o.emploi_metier,
    datePosted: posted,
    validThrough: through,
    identifier: { '@type': 'PropertyValue', name: o.raison_sociale, value: o.ref_offre },
    hiringOrganization: { '@type': 'Organization', name: o.raison_sociale },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: o.ville,
        addressRegion: 'Souss-Massa',
        addressCountry: 'MA',
      },
    },
    employmentType: CONTRACT_SCHEMA[o.type_contrat] || 'OTHER',
    totalJobOpenings: o.nbre_postes || 1,
    directApply: true,
    url: `${SITE_URL}/emploi/${o.slug}`,
  };
  if (Array.isArray(o.required_skills) && o.required_skills.length) {
    jsonLd.skills = o.required_skills.join(', ');
  }

  const body = `
    <h1>${esc(title)}</h1>
    <p><strong>${esc(o.raison_sociale)}</strong> — ${esc(o.ville)} — ${esc(o.type_contrat)}
       — ${esc(o.nbre_postes || 1)} poste(s) — publiée le ${esc(posted)}</p>
    <div>${esc(o.full_description || o.meta_description || '').replace(/\n/g, '<br />')}</div>
    ${Array.isArray(o.required_skills) && o.required_skills.length
      ? `<p>Compétences : ${o.required_skills.map(esc).join(', ')}</p>` : ''}
    ${o.suggested_salary_range ? `<p>Rémunération indicative : ${esc(o.suggested_salary_range)}</p>` : ''}
    <p><a href="${SITE_URL}/offres">Toutes les offres d'emploi Souss-Massa</a></p>`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: `${SITE_URL}/emploi/${o.slug}`,
    type: 'article',
    jsonLd,
    body,
    found: true,
  };
}

// Google for Jobs exige une date de fin credible. 60 jours apres publication
// correspond a la duree de vie reelle des offres ANAPEC reprises ici.
function validThrough(posted: string): string {
  const d = new Date(posted);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 60);
    return fallback.toISOString().slice(0, 10);
  }
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}

// --- Article Observatoire -------------------------------------------------
async function articleMeta(slug: string): Promise<Meta> {
  const rows = await sbGet(
    `observatoire_articles?select=*&statut=eq.publie&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  if (rows === null) return { ...emptyMeta(), degraded: true };
  const a = rows[0];
  if (!a) return emptyMeta();

  const description = clamp(a.meta_description || a.chapo || a.titre, 158);
  return {
    title: `${a.titre} | ${SITE_NAME}`,
    description,
    canonical: `${SITE_URL}/observatoire/${a.slug}`,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: a.titre,
      description,
      datePublished: String(a.date_publi || '').slice(0, 10),
      dateModified: String(a.date_publi || '').slice(0, 10),
      author: {
        '@type': 'Person',
        name: a.auteur || AUTEUR_NOM,
        jobTitle: AUTEUR_TITRE,
        ...(AUTEUR_LINKEDIN ? { sameAs: [AUTEUR_LINKEDIN] } : {}),
      },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/observatoire/${a.slug}` },
      inLanguage: 'fr',
    },
    body: `<h1>${esc(a.titre)}</h1><p>${esc(a.chapo || '')}</p>` +
          `<p>Analyse signée ${esc(a.auteur || AUTEUR_NOM)} — ${esc(AUTEUR_TITRE)}` +
          `${AUTEUR_LINKEDIN ? ` (<a href="${AUTEUR_LINKEDIN}">LinkedIn</a>)` : ''}</p>`,
    found: true,
  };
}

// Identique a `slugify` de components/SEO.tsx : les URL /recrutement/{slug} sont
// construites cote client a partir de `raison_sociale`, il n'existe aucune
// colonne slug pour les entreprises. Les deux implementations doivent rester
// rigoureusement equivalentes, sinon la page pre-rendue ne correspond plus a
// celle que React affiche.
function slugifyCompany(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface CompanyOffer {
  raison_sociale: string;
  ville: string;
  nbre_postes: number | null;
  emploi_metier: string;
  slug: string;
}

// Index des offres actives, mis en cache dans l'instance edge : la page
// entreprise a besoin de TOUTES les offres pour retrouver celle dont le nom
// slugifie correspond a l'URL demandee.
let offersCache: { rows: CompanyOffer[]; at: number } | null = null;
const OFFERS_TTL = 5 * 60 * 1000;

async function loadOffers(): Promise<CompanyOffer[] | null> {
  if (offersCache && Date.now() - offersCache.at < OFFERS_TTL) return offersCache.rows;
  const rows = await sbGet(
    'job_offers?select=raison_sociale,ville,nbre_postes,emploi_metier,slug&statut=eq.active',
  );
  if (rows === null) return offersCache?.rows || null;
  offersCache = { rows: rows as CompanyOffer[], at: Date.now() };
  return offersCache.rows;
}

// --- Page entreprise /recrutement/{slug} ----------------------------------
async function companyMeta(slug: string): Promise<Meta> {
  const all = await loadOffers();
  if (all === null) return { ...emptyMeta(), degraded: true };

  const offers = all.filter((o) => slugifyCompany(o.raison_sociale) === slug);
  if (offers.length === 0) return emptyMeta();

  const company = offers[0].raison_sociale;
  const cities = Array.from(new Set(offers.map((o) => o.ville).filter(Boolean)));
  const totalPostes = offers.reduce((s, o) => s + (Number(o.nbre_postes) || 1), 0);
  const cityLabel = cities.length === 1 ? cities[0] : 'Souss-Massa';
  const plurielO = offers.length > 1 ? 's' : '';
  const plurielP = totalPostes > 1 ? 's' : '';

  // Titre et description repris a l'identique de pages/CompanyJobs.tsx : le
  // robot social et le visiteur doivent lire la meme chose.
  const title = `Recrutement ${company} à ${cityLabel} — offres d'emploi`;
  const description = clamp(
    `${company} recrute à ${cityLabel} : ${offers.length} offre${plurielO} d'emploi ` +
    `(${totalPostes} poste${plurielP}) à pourvoir dans la région Souss-Massa. Postulez en ligne.`,
    158,
  );

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: `${SITE_URL}/recrutement/${slug}`,
    type: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Offres d'emploi — ${company}`,
      numberOfItems: offers.length,
      itemListElement: offers.slice(0, 30).map((o, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/emploi/${o.slug}`,
        name: o.emploi_metier,
      })),
    },
    body: `
      <h1>Recrutement ${esc(company)}</h1>
      <p>${esc(offers.length)} offre${plurielO} d'emploi · ${esc(totalPostes)} poste${plurielP}${
        cities.length ? ` · ${cities.map(esc).join(', ')}` : ''}</p>
      <ul>${offers.slice(0, 30).map((o) =>
        `<li><a href="${SITE_URL}/emploi/${encodeURIComponent(o.slug)}">${esc(o.emploi_metier)} — ${esc(o.ville)}</a></li>`,
      ).join('')}</ul>`,
    found: true,
  };
}

function emptyMeta(): Meta {
  return { title: '', description: '', canonical: '', type: 'website', found: false };
}

// --- Injection dans le <head> --------------------------------------------
// On remplace les balises existantes plutot que d'en ajouter : deux <title> ou
// deux canonical dans la meme page, c'est un signal contradictoire pour Google.
function inject(html: string, meta: Meta): string {
  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(meta.title)}</title>`);
  out = out.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${esc(meta.description)}" />`,
  );
  out = out.replace(
    /<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${esc(meta.canonical)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${esc(meta.canonical)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:type"[^>]*>/i,
    `<meta property="og:type" content="${esc(meta.type)}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
  );

  if (meta.jsonLd) {
    // `</script>` a l'interieur d'une chaine JSON refermerait la balise.
    const ld = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
    out = out.replace('</head>', `    <script type="application/ld+json">${ld}</script>\n  </head>`);
  }

  // Contenu pour les robots qui n'executent pas JavaScript. Dans <noscript> :
  // strictement invisible pour un visiteur normal, donc aucun risque de
  // clignotement avant le montage de React.
  if (meta.body) {
    out = out.replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript>${meta.body}</noscript>`);
  }

  return out;
}

// index.html est un fichier statique du deploiement : on le relit a la volee
// pour ne jamais coder en dur le nom hashe du bundle. Mise en cache dans
// l'instance edge pour eviter un aller-retour a chaque requete.
let shellCache: { html: string; at: number } | null = null;
const SHELL_TTL = 5 * 60 * 1000;

async function loadShell(origin: string): Promise<string | null> {
  if (shellCache && Date.now() - shellCache.at < SHELL_TTL) return shellCache.html;
  try {
    const res = await fetch(`${origin}/index.html`, { headers: { 'x-prerender': '1' } });
    if (!res.ok) return shellCache?.html || null;
    const html = await res.text();
    if (!html.includes('<div id="root">')) return shellCache?.html || null;
    shellCache = { html, at: Date.now() };
    return html;
  } catch {
    return shellCache?.html || null;
  }
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  // Le chemin d'origine est passe par la reecriture vercel.json (`?p=...`).
  const path = url.searchParams.get('p') || url.pathname;

  const shell = await loadShell(url.origin);
  if (!shell) {
    // Impossible de lire le shell : on laisse Vercel servir la page normalement.
    return Response.redirect(`${url.origin}/index.html`, 302);
  }

  const send = (html: string, status = 200) =>
    new Response(html, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Cache CDN court + revalidation en arriere-plan : une offre modifiee
        // remonte vite, sans taper Supabase a chaque visite.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });

  try {
    let meta: Meta | null = null;
    const offer = /^\/emploi\/([^/?#]+)/.exec(path);
    const article = /^\/observatoire\/([^/?#]+)/.exec(path);
    const company = /^\/recrutement\/([^/?#]+)/.exec(path);

    if (offer) meta = await offerMeta(decodeURIComponent(offer[1]));
    else if (article) meta = await articleMeta(decodeURIComponent(article[1]));
    else if (company) meta = await companyMeta(decodeURIComponent(company[1]));

    if (!meta || meta.degraded) return send(shell);        // Supabase muet : statu quo
    if (!meta.found) {
      // La ressource n'existe vraiment pas : un vrai 404 evite les « soft 404 »
      // dans la Search Console. Le SPA affiche sa page NotFound normalement.
      return send(shell.replace(
        /<meta\s+name="robots"[^>]*>/i,
        '<meta name="robots" content="noindex, follow" />',
      ), 404);
    }
    return send(inject(shell, meta));
  } catch {
    return send(shell);
  }
}
