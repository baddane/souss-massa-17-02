import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// ----- CONFIG -----

const SUPABASE_OFFERS_URL = process.env.VITE_SUPABASE_OFFERS_URL || '';
const SUPABASE_OFFERS_KEY = process.env.VITE_SUPABASE_OFFERS_ANON_KEY || '';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

const ANAPEC_BASE = 'https://anapec.org';
const ANAPEC_SEARCH_URL = `${ANAPEC_BASE}/sigec-app-rv/chercheurs/offre_recherche/recherche_offre`;

const SOUSS_MASSA_CITIES = [
  'Agadir', 'Inezgane', 'Ait Melloul', 'Taroudant', 'Tiznit',
  'Ouarzazate', 'Chtouka Ait Baha', 'Tata', 'Sidi Ifni',
  'Zagora', 'Tinghir', 'Guelmim',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

// ----- TYPES -----

interface AnapecRawOffer {
  ref_offre: string;
  emploi_metier: string;
  raison_sociale: string;
  ville: string;
  type_contrat: string;
  nbre_postes: number;
  date_offre: string;
  description_brute: string;
  detail_url: string;
}

interface EnrichedOffer {
  ref_offre: string;
  emploi_metier: string;
  raison_sociale: string;
  ville: string;
  type_contrat: string;
  nbre_postes: number;
  date_offre: string;
  full_description: string;
  meta_description: string;
  seo_keywords: string[];
  required_skills: string[];
  suggested_salary_range: string;
  source: string;
}

// ----- SCRAPER -----

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, headers: { ...HEADERS, ...options.headers } });
      if (res.ok) return res;
      console.warn(`HTTP ${res.status} for ${url}, retry ${i + 1}/${retries}`);
    } catch (err) {
      console.warn(`Fetch error for ${url}, retry ${i + 1}/${retries}:`, err);
    }
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

async function scrapeSearchResults(city?: string): Promise<AnapecRawOffer[]> {
  const formData = new URLSearchParams();
  formData.set('typeRecherche', 'avancee');
  formData.set('region', '9'); // Souss-Massa region code
  if (city) formData.set('ville', city);

  const res = await fetchWithRetry(ANAPEC_SEARCH_URL, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const html = await res.text();
  return parseSearchResults(html);
}

function parseSearchResults(html: string): AnapecRawOffer[] {
  const $ = cheerio.load(html);
  const offers: AnapecRawOffer[] = [];

  // ANAPEC uses table rows or card divs for results
  // Try table format first
  $('table.result tbody tr, .offre-item, .card-offre, tr.offre').each((_, el) => {
    const $row = $(el);
    const cells = $row.find('td');

    if (cells.length >= 4) {
      const ref = cells.eq(0).text().trim();
      const titre = cells.eq(1).text().trim();
      const entreprise = cells.eq(2).text().trim();
      const ville = cells.eq(3).text().trim();
      const contrat = cells.eq(4).text().trim() || 'CDD';
      const postes = parseInt(cells.eq(5).text().trim()) || 1;
      const date = cells.eq(6).text().trim() || new Date().toISOString().split('T')[0];
      const link = $row.find('a').attr('href') || '';

      if (ref && titre) {
        offers.push({
          ref_offre: ref,
          emploi_metier: titre,
          raison_sociale: entreprise || 'Entreprise confidentielle',
          ville: ville || 'Agadir',
          type_contrat: normalizeContractType(contrat),
          nbre_postes: postes,
          date_offre: normalizeDate(date),
          description_brute: '',
          detail_url: link.startsWith('http') ? link : `${ANAPEC_BASE}${link}`,
        });
      }
    }
  });

  // Try div/card format (ANAPEC sometimes uses this)
  if (offers.length === 0) {
    $('.resultats-offre, .liste-offres .offre, .job-listing').each((_, el) => {
      const $card = $(el);
      const titre = $card.find('.titre-offre, h3, h4, .job-title').first().text().trim();
      const ref = $card.find('.ref-offre, .reference').first().text().trim().replace(/[^A-Z0-9/]/gi, '');
      const ville = $card.find('.ville-offre, .location').first().text().trim();
      const entreprise = $card.find('.entreprise, .company').first().text().trim();
      const link = $card.find('a').attr('href') || '';

      if (titre) {
        offers.push({
          ref_offre: ref || `ANAPEC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          emploi_metier: titre,
          raison_sociale: entreprise || 'Entreprise confidentielle',
          ville: ville || 'Agadir',
          type_contrat: 'CDD',
          nbre_postes: 1,
          date_offre: new Date().toISOString().split('T')[0],
          description_brute: $card.find('.description, .detail, p').first().text().trim(),
          detail_url: link.startsWith('http') ? link : `${ANAPEC_BASE}${link}`,
        });
      }
    });
  }

  return offers;
}

async function scrapeOfferDetail(url: string): Promise<string> {
  if (!url || url === ANAPEC_BASE) return '';
  try {
    const res = await fetchWithRetry(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const description = $('.detail-offre, .description-offre, .contenu-offre, .job-description, main .content')
      .first().text().trim();
    return description || $('main, .container, #content').first().text().trim().slice(0, 2000);
  } catch {
    return '';
  }
}

// ----- AI ENRICHMENT -----

async function enrichOffer(raw: AnapecRawOffer): Promise<EnrichedOffer> {
  if (!GEMINI_API_KEY) {
    return fallbackEnrichment(raw);
  }

  const prompt = `Tu es un expert RH au Maroc. À partir de cette offre ANAPEC basique, génère une fiche de poste enrichie et professionnelle.

Offre brute:
- Titre: ${raw.emploi_metier}
- Entreprise: ${raw.raison_sociale}
- Ville: ${raw.ville}
- Type contrat: ${raw.type_contrat}
- Nombre de postes: ${raw.nbre_postes}
- Description brute: ${raw.description_brute || 'Aucune description fournie'}

Réponds UNIQUEMENT en JSON valide avec ces champs:
{
  "full_description": "Description détaillée du poste (3-4 paragraphes, missions, profil recherché, conditions)",
  "meta_description": "Résumé SEO en 1 phrase (max 160 caractères)",
  "seo_keywords": ["mot-clé1", "mot-clé2", ...],
  "required_skills": ["compétence1", "compétence2", ...],
  "suggested_salary_range": "Fourchette salariale estimée (ex: 4000-6000 MAD)"
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const enriched = JSON.parse(jsonMatch[0]);
      return {
        ref_offre: raw.ref_offre,
        emploi_metier: raw.emploi_metier,
        raison_sociale: raw.raison_sociale,
        ville: raw.ville,
        type_contrat: raw.type_contrat,
        nbre_postes: raw.nbre_postes,
        date_offre: raw.date_offre,
        full_description: enriched.full_description || raw.description_brute,
        meta_description: enriched.meta_description || `${raw.emploi_metier} à ${raw.ville} - ${raw.type_contrat}`,
        seo_keywords: enriched.seo_keywords || [],
        required_skills: enriched.required_skills || [],
        suggested_salary_range: enriched.suggested_salary_range || 'Non spécifié',
        source: 'anapec',
      };
    }
  } catch (err) {
    console.warn('Gemini enrichment failed for', raw.ref_offre, err);
  }

  return fallbackEnrichment(raw);
}

function fallbackEnrichment(raw: AnapecRawOffer): EnrichedOffer {
  return {
    ref_offre: raw.ref_offre,
    emploi_metier: raw.emploi_metier,
    raison_sociale: raw.raison_sociale,
    ville: raw.ville,
    type_contrat: raw.type_contrat,
    nbre_postes: raw.nbre_postes,
    date_offre: raw.date_offre,
    full_description: raw.description_brute || `Offre d'emploi: ${raw.emploi_metier} chez ${raw.raison_sociale} à ${raw.ville}. Contrat ${raw.type_contrat}. ${raw.nbre_postes} poste(s) disponible(s). Source: ANAPEC.`,
    meta_description: `${raw.emploi_metier} à ${raw.ville} - ${raw.type_contrat} | ${raw.raison_sociale}`,
    seo_keywords: [raw.emploi_metier, raw.ville, raw.type_contrat, 'emploi maroc', 'anapec'].filter(Boolean),
    required_skills: [],
    suggested_salary_range: 'Non spécifié',
    source: 'anapec',
  };
}

// ----- SUPABASE STORAGE -----

async function saveToSupabase(offers: EnrichedOffer[]): Promise<{ inserted: number; skipped: number }> {
  if (!SUPABASE_OFFERS_URL || !SUPABASE_OFFERS_KEY) {
    console.error('Supabase env vars missing. Set VITE_SUPABASE_OFFERS_URL and VITE_SUPABASE_OFFERS_ANON_KEY.');
    return { inserted: 0, skipped: 0 };
  }

  const supabase = createClient(SUPABASE_OFFERS_URL, SUPABASE_OFFERS_KEY);
  let inserted = 0;
  let skipped = 0;

  for (const offer of offers) {
    const { data: existing } = await supabase
      .from('job_offers')
      .select('id')
      .eq('ref_offre', offer.ref_offre)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from('job_offers').insert(offer);

    if (error) {
      console.error(`Failed to insert ${offer.ref_offre}:`, error.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

// ----- HELPERS -----

function normalizeContractType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('cdi') || lower.includes('indétermin')) return 'CDI';
  if (lower.includes('stage') || lower.includes('stagiaire')) return 'Stage';
  if (lower.includes('interim') || lower.includes('intérim')) return 'Intérim';
  if (lower.includes('freelance') || lower.includes('indépendant')) return 'Freelance';
  return 'CDD';
}

function normalizeDate(raw: string): string {
  const parts = raw.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (parts) {
    const day = parts[1].padStart(2, '0');
    const month = parts[2].padStart(2, '0');
    const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

// ----- MAIN -----

async function main() {
  console.log('=== ANAPEC Scraper - Souss-Massa ===');
  console.log(`Date: ${new Date().toISOString()}`);

  const allRawOffers: AnapecRawOffer[] = [];

  // Scrape by city for better coverage
  for (const city of SOUSS_MASSA_CITIES) {
    console.log(`\nScraping offers for ${city}...`);
    try {
      const offers = await scrapeSearchResults(city);
      console.log(`  Found ${offers.length} offers`);

      // Fetch detail pages for richer descriptions
      for (const offer of offers) {
        if (offer.detail_url) {
          console.log(`  Fetching detail for ${offer.ref_offre}...`);
          offer.description_brute = await scrapeOfferDetail(offer.detail_url);
          await new Promise(r => setTimeout(r, 500)); // polite delay
        }
      }

      allRawOffers.push(...offers);
    } catch (err) {
      console.warn(`  Failed to scrape ${city}:`, err);
    }
  }

  // Deduplicate by ref_offre
  const uniqueOffers = Array.from(
    new Map(allRawOffers.map(o => [o.ref_offre, o])).values()
  );
  console.log(`\nTotal unique offers: ${uniqueOffers.length}`);

  // Enrich with AI
  console.log('\nEnriching offers with AI...');
  const enrichedOffers: EnrichedOffer[] = [];
  for (const raw of uniqueOffers) {
    console.log(`  Enriching: ${raw.emploi_metier} (${raw.ref_offre})`);
    const enriched = await enrichOffer(raw);
    enrichedOffers.push(enriched);
    await new Promise(r => setTimeout(r, 300)); // rate limit
  }

  // Save to Supabase
  console.log('\nSaving to Supabase...');
  const { inserted, skipped } = await saveToSupabase(enrichedOffers);

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicates/errors): ${skipped}`);
}

main().catch(console.error);
