/**
 * Scraper rekrute.com — region Souss-Massa (Agadir), reutilisable.
 *
 * Etape 1 du pipeline d'import (voir IMPORT_OFFRES.md) :
 *   - scrape les offres de la region Souss-Massa sur rekrute.com
 *   - normalise les villes (communes Souss-Massa, exclut le hors-region)
 *   - nettoie titres + descriptions, genere ref_offre + slug uniques
 *   - DEDUPLIQUE contre la base Supabase (ignore les offres deja importees)
 *   - ecrit les NOUVELLES offres (en francais) dans scripts/import/pending-rekrute.json
 *
 * Usage :  node scripts/scrape-rekrute.cjs
 *
 * La traduction FR/EN/AR + l'insertion se font ensuite (voir IMPORT_OFFRES.md).
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

const MAX_PAGES = 30;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};
const pageUrl = (p) =>
  `https://www.rekrute.com/offres.html?p=${p}&s=1&o=1&keyword=&regionId%5B0%5D=1&st=d&jobLocation=RK`;

// --- Normalisation des villes Souss-Massa ---
const EXCLUDE = new Set(['Guelmim', 'Dakhla', 'Laâyoune', 'Essaouira', 'Ouarzazate', 'Tan-Tan', 'Sidi Ifni']);
const VILLE_MAP = {
  'Agadir': 'Agadir',
  'Ait Baha': 'Aït Baha', 'Aït Baha': 'Aït Baha',
  'Lqliâa - Inezgane-Aït Melloul': 'Inezgane', 'Inezgane': 'Inezgane',
  'Ait Melloul': 'Aït Melloul', 'Aït Melloul': 'Aït Melloul',
  'Taroudant': 'Taroudant',
  'Tiznit': 'Tiznit',
  'Marrakech': 'Agadir', // les listings "Marrakech & Agadir" couvrent Agadir
  'Taliouine': 'Taroudant', 'Taliouine - Askaoun': 'Taroudant',
  'Chtouka Ait Baha - Agadir': 'Biougra', 'Belfaa - Chtouka-Aït Baha': 'Biougra', 'Inchaden': 'Biougra', 'Biougra': 'Biougra',
  'Agadir et Sud': 'Agadir', 'Agadir_Laâyoune': 'Agadir',
  'Dcheira Al jihadia - Agadir': 'Dcheira El Jihad', 'Dcheira El Jihad': 'Dcheira El Jihad',
  'Oulad Teima': 'Oulad Teima', 'Tata': 'Tata',
};
function mapVille(raw) {
  if (EXCLUDE.has(raw)) return null;
  if (VILLE_MAP[raw]) return VILLE_MAP[raw];
  // fallback : premier segment avant un separateur, puis re-essai
  const head = raw.split(/ - |_/)[0].trim();
  if (EXCLUDE.has(head)) return null;
  return VILLE_MAP[head] || null; // null => non-Souss-Massa connu => exclu
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function cleanTitle(t) {
  return t.replace(/\((?:H\/F|F\/H|M\/F|H\/F\/X)\)/gi, '').replace(/\s{2,}/g, ' ').replace(/\s*-\s*$/, '').trim();
}
function cleanDesc(d) {
  return d.split(/Publication\s*:/)[0].replace(/\s{2,}/g, ' ').trim();
}
function parseDate(raw) {
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return new Date().toISOString().split('T')[0];
}
function normalizeContract(raw) {
  const l = (raw || '').toLowerCase();
  if (l.includes('cdi')) return 'CDI';
  if (l.includes('stage')) return 'Stage';
  if (l.includes('intérim') || l.includes('interim') || l.includes('temporaire')) return 'Intérim';
  if (l.includes('freelance')) return 'Freelance';
  if (l.includes('cdd') || l.includes('déterminée') || l.includes('anapec') || l.includes('insertion')) return 'CDD';
  return 'CDI';
}

function parseCard($, el) {
  const li = $(el);
  const id = (li.attr('id') || '').trim();
  const a = li.find('a.titreJob').first();
  const titleRaw = a.text().replace(/\s+/g, ' ').trim();
  let emploi_metier = titleRaw, ville = 'Agadir';
  const parts = titleRaw.split('|');
  if (parts.length >= 2) { emploi_metier = parts[0].trim(); ville = parts[1].replace(/\(.*?\)/g, '').trim(); }
  const raison_sociale = (li.find('img.photo').attr('alt') || '').trim() || 'Entreprise confidentielle';
  const description_brute = li.find('.section .holder').first().text().replace(/\s+/g, ' ').trim();
  let date_offre = new Date().toISOString().split('T')[0], nbre_postes = 1;
  li.find('*').each((i, e) => {
    const t = $(e).text().replace(/\s+/g, ' ').trim();
    if (/Publication\s*:/.test(t) && t.length < 160) {
      date_offre = parseDate(t);
      const pm = t.match(/Postes?\s*propos[ée]s?\s*:?\s*(\d+)/i);
      if (pm) nbre_postes = parseInt(pm[1]) || 1;
    }
  });
  let type_contrat = 'CDI', fonction = '';
  li.find('ul li').each((i, e) => {
    const t = $(e).text().replace(/\s+/g, ' ').trim();
    if (/Type de contrat/i.test(t)) type_contrat = normalizeContract(t.split(':')[1] || '');
    else if (/Fonction/i.test(t)) fonction = (t.split(':')[1] || '').trim();
  });
  return { id, rawVille: ville, emploi_metier: cleanTitle(emploi_metier), raison_sociale,
    full_description: cleanDesc(description_brute), date_offre, nbre_postes, type_contrat, fonction };
}

async function fetchPage(p, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(pageUrl(p), { headers: HEADERS });
      if (res.ok) return await res.text();
      if (res.status >= 500) { await new Promise(r => setTimeout(r, 3000 * (i + 1))); continue; }
      return null;
    } catch { await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
  return null;
}

async function existingFromDB() {
  const refs = new Set(), slugs = new Set();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/job_offers?select=ref_offre,slug`, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  });
  if (res.ok) for (const r of await res.json()) { if (r.ref_offre) refs.add(r.ref_offre); if (r.slug) slugs.add(r.slug); }
  return { refs, slugs };
}

async function main() {
  console.log('=== Scraper rekrute.com — Souss-Massa ===');
  const seen = new Map();
  for (let p = 1; p <= MAX_PAGES; p++) {
    const html = await fetchPage(p);
    if (!html) { console.log(`page ${p}: indisponible -> stop`); break; }
    const $ = cheerio.load(html);
    const cards = $('li.post-id');
    if (cards.length === 0) { console.log(`page ${p}: 0 offre -> stop`); break; }
    let added = 0;
    cards.each((i, el) => { const o = parseCard($, el); if (o.id && !seen.has(o.id)) { seen.set(o.id, o); added++; } });
    console.log(`page ${p}: ${cards.length} offres, ${added} nouvelles (total brut ${seen.size})`);
    if (added === 0) break;
    await new Promise(r => setTimeout(r, 1000));
  }

  // Normalisation + exclusion hors-region
  const { refs, slugs } = await existingFromDB();
  const out = [];
  const slugSeen = new Set(slugs);
  let excluded = 0, dupes = 0;
  for (const o of seen.values()) {
    const ville = mapVille(o.rawVille);
    if (!ville) { excluded++; continue; }
    const ref_offre = `RK-${o.id}`;
    if (refs.has(ref_offre)) { dupes++; continue; } // deja en base
    let slug = slugify(`${o.emploi_metier}-${ville}`), n = 1;
    while (slugSeen.has(slug)) { n++; slug = `${slugify(`${o.emploi_metier}-${ville}`)}-${n}`; }
    slugSeen.add(slug);
    out.push({
      id: `rk-${o.id}`, ref_offre, ville, raison_sociale: o.raison_sociale,
      type_contrat: o.type_contrat, nbre_postes: o.nbre_postes, date_offre: o.date_offre,
      emploi_metier: o.emploi_metier, full_description: o.full_description, fonction: o.fonction,
      slug, source: 'rekrute',
    });
  }

  const dir = path.join(__dirname, 'import');
  fs.mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, 'pending-rekrute.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));

  console.log(`\nHors-region exclues : ${excluded} | deja en base : ${dupes}`);
  const byCity = {}; out.forEach(o => byCity[o.ville] = (byCity[o.ville] || 0) + 1);
  console.log(`NOUVELLES offres a importer : ${out.length}`);
  console.log('Par ville :', JSON.stringify(byCity));
  console.log(`\nEcrit dans : ${outFile}`);
  if (out.length > 0) {
    console.log('\nProchaine etape : demande a Claude →');
    console.log('  "traduis et importe scripts/import/pending-rekrute.json"');
  } else {
    console.log('\nRien de nouveau a importer.');
  }
}
main().catch(e => { console.error('ERREUR:', e.message); process.exit(1); });
