/**
 * Scraper marocannonces.com — rubrique Offres d'emploi, région Souss-Massa.
 * Source INDEPENDANTE de rekrute (lancer séparément).
 *
 * Etape 1 du pipeline d'import (voir IMPORT_OFFRES.md) :
 *   - scrape les annonces emploi des villes Souss-Massa disponibles sur le site
 *     (Agadir, Taroudant, Tiznit — seules villes Souss-Massa filtrables)
 *   - recupere le detail de chaque annonce (description + champs structures)
 *   - normalise, genere ref_offre (MA-<id>) + slug uniques
 *   - DEDUPLIQUE contre la base Supabase
 *   - ecrit les NOUVELLES offres dans scripts/import/pending-marocannonces.json
 *
 * Usage :  node scripts/scrape-marocannonces.cjs
 *
 * NB : Emploi.ma n'est PAS inclus (protege par Cloudflare + injoignable depuis
 * l'environnement d'execution — voir IMPORT_OFFRES.md).
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

const BASE = 'https://www.marocannonces.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

// Villes Souss-Massa filtrables sur marocannonces (id "t" du select ville)
const CITIES = [
  { ville: 'Agadir', slug: 'agadir', t: 552 },
  { ville: 'Taroudant', slug: 'taroudant', t: 800 },
  { ville: 'Tiznit', slug: 'tiznit', t: 608 },
];
const listUrl = (c) => `${BASE}/maroc/offres-emploi-${c.slug}-b309-t${c.t}.html`;

const MONTHS = { jan:1, fév:2, fev:2, feb:2, mar:3, avr:4, apr:4, mai:5, may:5, jun:6, juin:6,
  jul:7, juil:7, aoû:8, aou:8, aug:8, sep:9, sept:9, oct:10, nov:11, déc:12, dec:12 };

function parseDate(txt) {
  const m = txt.match(/Publi[ée]e?\s*le\s*:?\s*(\d{1,2})\s+([A-Za-zéûô]+)/i);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = MONTHS[m[2].toLowerCase().slice(0, 4)] || MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (mon) return `${new Date().getFullYear()}-${String(mon).padStart(2, '0')}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}
function normalizeContract(raw) {
  const l = (raw || '').toLowerCase();
  if (l.includes('cdi')) return 'CDI';
  if (l.includes('stage')) return 'Stage';
  if (l.includes('alternance')) return 'Alternance';
  if (l.includes('intérim') || l.includes('interim') || l.includes('temporaire')) return 'Intérim';
  if (l.includes('freelance') || l.includes('indépendant')) return 'Freelance';
  if (l.includes('cdd') || l.includes('déterminée')) return 'CDD';
  return 'CDI'; // "A discuter" / non precise => CDI par defaut
}
function normalizeSalary(raw) {
  if (!raw) return null;
  const r = raw.replace(/\s+/g, ' ').trim();
  if (/discuter|négoci|negoci|selon/i.test(r) || !/\d/.test(r)) return null;
  return r.replace(/(\d)\s+(\d)/g, '$1$2').replace(/\bDH\b|\bdh\b|dirhams?/gi, 'MAD').replace(/\s*-\s*/g, '-').trim();
}
function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Extrait "Label : valeur" jusqu'au prochain label connu
const LABELS = ['Domaine', 'Fonction', 'Contrat', 'Entreprise', 'Salaire', "Niveau d'études", 'Ville', 'Annonceur', 'Téléphone'];
function field(text, label) {
  const others = LABELS.filter(l => l !== label).map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\s*:\\s*(.+?)\\s*(?:(?:" + others + ")\\s*:|$)", 'i');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

async function fetchText(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.text();
      if (res.status >= 500) { await new Promise(r => setTimeout(r, 2500 * (i + 1))); continue; }
      return null;
    } catch { await new Promise(r => setTimeout(r, 2500 * (i + 1))); }
  }
  return null;
}

function parseDetail(html, id) {
  const $ = cheerio.load(html);
  const block = $('.description').first().clone();
  block.find('script,style').remove();
  const text = block.text().replace(/\s+/g, ' ').trim();
  // corps = texte entre "Annonce N°: <id>" et le 1er label
  let body = '';
  const after = text.split(new RegExp('Annonce\\s*N[°o]\\s*:?\\s*' + id, 'i'))[1] || text;
  const cut = after.search(new RegExp('(?:' + LABELS.join('|') + ')\\s*:', 'i'));
  body = (cut > 0 ? after.slice(0, cut) : after).replace(/\s+/g, ' ').trim();
  return {
    body,
    fonction: field(text, 'Fonction') || field(text, 'Domaine'),
    contrat: field(text, 'Contrat'),
    entreprise: field(text, 'Entreprise'),
    salaire: field(text, 'Salaire'),
    niveau: field(text, "Niveau d'études"),
    villeDetail: field(text, 'Ville'),
    date_offre: parseDate(text),
  };
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
  console.log('=== Scraper marocannonces.com — Souss-Massa ===');
  const { refs, slugs } = await existingFromDB();
  const slugSeen = new Set(slugs);
  const out = [];
  let scanned = 0, dupes = 0;

  for (const c of CITIES) {
    const html = await fetchText(listUrl(c));
    if (!html) { console.log(`${c.ville}: liste indisponible`); continue; }
    const $ = cheerio.load(html);
    const cards = [];
    $('ul.cars-list li').each((i, el) => {
      const a = $(el).find('a[href*="/annonce/"]').first();
      const href = a.attr('href') || '';
      const m = href.match(/\/annonce\/(\d+)\//);
      if (!m) return;
      cards.push({ id: m[1], title: $(el).find('h3').first().text().replace(/\s+/g, ' ').trim(),
        location: $(el).find('.location').first().text().trim(),
        url: href.startsWith('http') ? href : `${BASE}/${href.replace(/^\//, '')}` });
    });
    console.log(`${c.ville}: ${cards.length} annonces`);

    for (const card of cards) {
      scanned++;
      const ref_offre = `MA-${card.id}`;
      if (refs.has(ref_offre)) { dupes++; continue; }
      const dhtml = await fetchText(card.url);
      await new Promise(r => setTimeout(r, 600));
      if (!dhtml) continue;
      const d = parseDetail(dhtml, card.id);
      const ville = c.ville; // filtre par ville canonique
      const emploi_metier = card.title.replace(/\s+/g, ' ').trim();
      if (!emploi_metier) continue;
      let slug = slugify(`${emploi_metier}-${ville}`), n = 1;
      while (slugSeen.has(slug)) { n++; slug = `${slugify(`${emploi_metier}-${ville}`)}-${n}`; }
      slugSeen.add(slug);
      let full = d.body && d.body.length > 60 ? d.body
        : `${emploi_metier} à ${ville}.${d.fonction ? ' Domaine : ' + d.fonction + '.' : ''} ${d.body || ''}`.trim();
      out.push({
        id: `ma-${card.id}`, ref_offre, ville,
        raison_sociale: (!d.entreprise || /confidentiel/i.test(d.entreprise)) ? 'Entreprise confidentielle' : d.entreprise,
        type_contrat: normalizeContract(d.contrat), nbre_postes: 1, date_offre: d.date_offre,
        emploi_metier, full_description: full, fonction: d.fonction,
        suggested_salary_range: normalizeSalary(d.salaire), niveau: d.niveau,
        slug, source: 'marocannonces',
      });
    }
  }

  const dir = path.join(__dirname, 'import');
  fs.mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, 'pending-marocannonces.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));

  console.log(`\nAnnonces scannees : ${scanned} | deja en base : ${dupes}`);
  const byCity = {}; out.forEach(o => byCity[o.ville] = (byCity[o.ville] || 0) + 1);
  console.log(`NOUVELLES offres a importer : ${out.length}`);
  console.log('Par ville :', JSON.stringify(byCity));
  console.log(`\nEcrit dans : ${outFile}`);
  if (out.length > 0) {
    console.log('\nProchaine etape : demande a Claude →');
    console.log('  "traduis et importe scripts/import/pending-marocannonces.json"');
  } else {
    console.log('\nRien de nouveau a importer.');
  }
}
main().catch(e => { console.error('ERREUR:', e.message); process.exit(1); });
