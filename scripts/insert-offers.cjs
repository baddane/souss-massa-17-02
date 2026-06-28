/**
 * Inserteur generique d'offres dans Supabase.
 *
 * Etape 3 du pipeline d'import (voir IMPORT_OFFRES.md).
 * Lit un fichier de records COMPLETS (deja traduits FR/EN/AR) et les insere,
 * en ignorant les offres dont le ref_offre ou le slug existe deja.
 *
 * Usage :  node scripts/insert-offers.cjs scripts/import/translated-offers.json
 *
 * Chaque record doit contenir les colonnes de la table job_offers :
 *   id, ville, ref_offre, type_contrat, raison_sociale, date_offre (YYYY-MM-DD),
 *   nbre_postes, emploi_metier, full_description, seo_keywords[], meta_description,
 *   suggested_salary_range, required_skills[], source, slug, statut, is_featured,
 *   emploi_metier_en/ar, full_description_en/ar, meta_description_en/ar,
 *   required_skills_en[]/ar[]
 */
const fs = require('fs');

const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

async function existing() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/job_offers?select=ref_offre,slug`, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  });
  const refs = new Set(), slugs = new Set();
  if (res.ok) for (const r of await res.json()) { if (r.ref_offre) refs.add(r.ref_offre); if (r.slug) slugs.add(r.slug); }
  return { refs, slugs };
}

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/insert-offers.cjs <fichier.json>'); process.exit(1); }
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Records dans le fichier : ${records.length}`);

  const { refs, slugs } = await existing();
  const toInsert = records.filter(r => !refs.has(r.ref_offre) && !slugs.has(r.slug));
  console.log(`Deja en base (ignores) : ${records.length - toInsert.length} | a inserer : ${toInsert.length}`);
  if (toInsert.length === 0) return;

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 10) {
    const batch = toInsert.slice(i, i + 10);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/job_offers`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) { console.error(`Lot ${i / 10 + 1} ECHEC: HTTP ${res.status} ${(await res.text()).slice(0, 400)}`); process.exit(1); }
    inserted += batch.length;
    console.log(`Lot ${i / 10 + 1}: ${batch.length} inseres (total ${inserted})`);
  }
  console.log(`\nTermine. ${inserted} offres inserees.`);
  console.log('Pense a regenerer la sitemap : node scripts/gen-sitemap.cjs');
}
main().catch(e => { console.error('ERREUR:', e.message); process.exit(1); });
