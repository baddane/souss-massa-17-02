/**
 * Regenere public/sitemap.xml depuis Supabase.
 *
 * Etape 4 du pipeline d'import (voir IMPORT_OFFRES.md).
 * Structure identique a l'Edge function api/sitemap.ts :
 *   pages statiques + pages secteur + pages ville (derivees des offres) + pages offre.
 *
 * Usage :  node scripts/gen-sitemap.cjs
 */
const fs = require('fs');
const path = require('path');

// Cle resolue par scripts/_supabase.cjs : service_role si SUPABASE_SERVICE_ROLE_KEY
// est definie, sinon repli sur la cle anon.
const { SUPABASE_URL, SUPABASE_KEY, logKeyMode } = require('./_supabase.cjs');
const SITE_URL = 'https://www.soussmassa-rh.com';

function toISODate(raw) {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isNaN(new Date(raw).getTime()) ? null : raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  logKeyMode('gen-sitemap');
  // On verifie explicitement le statut HTTP : une cle invalide renvoyait un objet
  // d'erreur JSON et le script echouait plus loin sur « offers.map is not a
  // function », message inexploitable au moment d'une bascule de cle.
  async function fetchRows(url, label) {
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
    const body = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(body)) {
      const detail = body && body.message ? body.message : `HTTP ${r.status}`;
      throw new Error(`Lecture ${label} impossible : ${detail}. Verifier la cle Supabase (SUPABASE_SERVICE_ROLE_KEY si definie).`);
    }
    return body;
  }

  const offers = await fetchRows(`${SUPABASE_URL}/rest/v1/job_offers?select=slug,date_offre,ville,raison_sociale&statut=eq.active&order=date_offre.desc`, 'job_offers');
  const obsArticles = await fetchRows(`${SUPABASE_URL}/rest/v1/observatoire_articles?select=slug,date_publi&statut=eq.publie&order=date_publi.desc`, 'observatoire_articles');

  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/offres', priority: '0.9', changefreq: 'daily' },
    { url: '/recruter', priority: '0.8', changefreq: 'monthly' },
    { url: '/observatoire', priority: '0.8', changefreq: 'daily' },
    { url: '/inscription-candidat', priority: '0.7', changefreq: 'monthly' },
      { url: '/contact', priority: '0.5', changefreq: 'monthly' },
  ];
  const sectorPages = ['informatique', 'commercial', 'administratif', 'industrie', 'sante', 'enseignement', 'tourisme', 'construction']
    .map(s => ({ url: `/offres?sector=${s}`, priority: '0.7', changefreq: 'daily' }));
  const cities = Array.from(new Set(offers.map(o => o.ville).filter(Boolean))).sort();
  const cityPages = cities.map(c => ({ url: `/offres/${slugify(c)}`, priority: '0.7', changefreq: 'daily' }));
  const recruiterPages = ['agadir', 'inezgane', 'ait-melloul', 'taroudant', 'tiznit', 'oulad-teima', 'biougra']
    .map(s => ({ url: `/recruter/${s}`, priority: '0.7', changefreq: 'monthly' }));

  // Pages « Recrutement <Entreprise> » (une par société ayant des offres, hors noms génériques)
  const companySlugs = Array.from(new Set(
    offers.map(o => o.raison_sociale)
      .filter(n => n && n.trim().length >= 3 && !/confidentiel/i.test(n))
      .map(slugify)
      .filter(Boolean)
  ));
  const companyPages = companySlugs.map(s => ({ url: `/recrutement/${s}`, priority: '0.6', changefreq: 'weekly' }));

  const allPages = [...staticPages, ...sectorPages, ...cityPages, ...recruiterPages, ...companyPages];
  const urls = allPages.map(p => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).concat(offers.map(o => `  <url>
    <loc>${SITE_URL}/emploi/${o.slug}</loc>
    <lastmod>${toISODate(o.date_offre) || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)).concat((obsArticles || []).map(a => `  <url>
    <loc>${SITE_URL}/observatoire/${a.slug}</loc>
    <lastmod>${toISODate(a.date_publi) || today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`)).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  const outFile = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(outFile, xml);
  console.log(`sitemap.xml regenere : ${offers.length} offres, ${cities.length} villes (${cities.join(', ')}), ${allPages.length} pages statiques/secteur/ville.`);
}
main().catch(e => { console.error('ERREUR:', e.message); process.exit(1); });
