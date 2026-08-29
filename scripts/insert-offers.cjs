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

// Cle resolue par scripts/_supabase.cjs : service_role si SUPABASE_SERVICE_ROLE_KEY
// est definie, sinon repli sur la cle anon.
const { SUPABASE_URL, SUPABASE_KEY, logKeyMode } = require('./_supabase.cjs');

async function existing() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/job_offers?select=ref_offre,slug`, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  });
  // Ne JAMAIS avaler cet echec : une liste vide ferait passer toutes les offres
  // pour nouvelles et provoquerait des doublons en base. On arrete net.
  if (!res.ok) {
    throw new Error(`Lecture des offres existantes impossible (HTTP ${res.status}) : dedoublonnage impossible, insertion annulee. Verifier la cle Supabase.`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('Reponse inattendue de Supabase lors du dedoublonnage : insertion annulee.');
  const refs = new Set(), slugs = new Set();
  for (const r of rows) { if (r.ref_offre) refs.add(r.ref_offre); if (r.slug) slugs.add(r.slug); }
  return { refs, slugs };
}

// Provisionnement des comptes employeurs pour les nouvelles entreprises.
//
// Chaque offre importee peut concerner une societe qui n'a pas encore de compte.
// L'endpoint cree le compte, genere le mot de passe et rattache ses offres ;
// l'admin retrouve les identifiants dans l'onglet « Identifiants ».
//
// VOLONTAIREMENT NON BLOQUANT : les offres sont deja inserees a ce stade. Un
// provisionnement en echec (secret absent, endpoint indisponible) ne doit jamais
// faire echouer un import reussi — le bouton « Créer les N comptes » de l'admin
// rattrape le retard a tout moment.
async function provisionnerComptes() {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) {
    console.log('\nCRON_SECRET absent : provisionnement des comptes employeurs non declenche.');
    console.log('  (a faire depuis /admin > Identifiants > « Créer les N comptes »)');
    return;
  }
  const base = process.env.SITE_URL || 'https://www.soussmassa-rh.com';
  try {
    const res = await fetch(`${base}/api/provision-companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ mode: 'auto' }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { console.warn(`\nProvisionnement des comptes : HTTP ${res.status} ${(body && body.error) || ''}`); return; }
    console.log(`\nComptes employeurs : ${body.provisionnees || 0} cree(s), ${(body.ignorees || []).length} ignore(s).`);
    for (const e of body.erreurs || []) console.warn('  ' + e);
  } catch (e) {
    console.warn('\nProvisionnement des comptes injoignable :', e.message);
  }
}

async function main() {
  logKeyMode('insert-offers');
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

  await provisionnerComptes();

  console.log('Pense a regenerer la sitemap : node scripts/gen-sitemap.cjs');
}
main().catch(e => { console.error('ERREUR:', e.message); process.exit(1); });
