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

const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';
const SITE_URL = 'https://soussmassa-rh.com';

function toISODate(raw) {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isNaN(new Date(raw).getTime()) ? null : raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/job_offers?select=slug,date_offre,ville&order=date_offre.desc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  });
  const offers = await res.json();
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/offres', priority: '0.9', changefreq: 'daily' },
    { url: '/contact', priority: '0.5', changefreq: 'monthly' },
  ];
  const sectorPages = ['informatique', 'commercial', 'administratif', 'industrie', 'sante', 'enseignement', 'tourisme', 'construction']
    .map(s => ({ url: `/offres?sector=${s}`, priority: '0.7', changefreq: 'daily' }));
  const cities = Array.from(new Set(offers.map(o => o.ville).filter(Boolean))).sort();
  const cityPages = cities.map(c => ({ url: `/offres?city=${encodeURIComponent(c)}`, priority: '0.7', changefreq: 'daily' }));

  const allPages = [...staticPages, ...sectorPages, ...cityPages];
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
