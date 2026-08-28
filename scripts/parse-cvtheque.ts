// Rattrapage des fiches CVtheque sans donnees structurees.
//
// POURQUOI : les fiches creees par le trigger `sync_candidature_to_cvtheque`
// ne recopient que nom / email / telephone / intitule du poste — jamais le
// contenu du CV. Sur ces profils, les filtres ville, niveau, diplome et
// competences de la CVtheque ne trouvent rien. Le bouton « Analyser les CV non
// traites » de l'admin fait le meme travail, mais dans le navigateur : il faut
// laisser l'onglet ouvert, et il repart de zero a chaque session. Ce script
// traite tout le stock d'un coup, en local ou en CI.
//
// PARSING : identique a celui de l'interface — `parseFields` de
// `src/services/cvFields.ts`, partage, aucun LLM, aucune donnee envoyee a un
// tiers. Seule l'extraction du texte differe (pdf.js en version Node).
//
// PREREQUIS : SUPABASE_SERVICE_ROLE_KEY. La table `cvtheque` et ses buckets
// sont reserves a l'admin : la cle anon ne peut ni les lire ni les ecrire, le
// script s'arrete donc immediatement sans elle.
//
//   export SUPABASE_SERVICE_ROLE_KEY='...'
//   npm run parse:cvtheque            # tout le stock
//   npm run parse:cvtheque -- --limit 10 --dry-run
//
// Les valeurs deja saisies a la main ne sont JAMAIS ecrasees.

import { parseFields } from '../src/services/cvFields';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!KEY) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY manquante.\n" +
    "La CVtheque est reservee a l'admin : la cle anon ne peut rien y lire.\n" +
    "  export SUPABASE_SERVICE_ROLE_KEY='...'   (Supabase → Settings → API)",
  );
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

interface Row {
  id: string;
  file_path: string;
  file_name: string | null;
  file_type: string | null;
  bucket: string;
  ville: string | null;
  quartier: string | null;
  diplome: string | null;
  niveau_etudes: string | null;
  competences: string[] | null;
  langues: string[] | null;
  experience_years: number | null;
  keywords: string[] | null;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) || 0 : 0;

async function extractTextNode(buf: Buffer, name: string, type: string | null): Promise<string> {
  const lower = (name || '').toLowerCase();

  if (lower.endsWith('.txt') || type === 'text/plain') return buf.toString('utf8');

  if (lower.endsWith('.pdf') || type === 'application/pdf') {
    // Build « legacy » : c'est la seule qui fonctionne hors navigateur.
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buf),
      useSystemFonts: true,
      // Pas de worker en Node : le travail se fait dans le thread principal.
      disableWorker: true,
    }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(' ') + '\n';
    }
    return text;
  }

  if (lower.endsWith('.docx') ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mod: any = await import('mammoth');
    const mammoth = mod.default || mod;
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value || '';
  }

  // Ancien .doc, images : pas d'extraction possible ici (l'OCR reste dans
  // l'interface admin, qui dispose de tesseract.js).
  return '';
}

async function main() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cvtheque` +
    `?select=id,file_path,file_name,file_type,bucket,ville,quartier,diplome,niveau_etudes,competences,langues,experience_years,keywords` +
    `&raw_text=is.null&file_path=not.is.null&order=created_at.desc` +
    (limit ? `&limit=${limit}` : ''),
    { headers },
  );
  if (!res.ok) {
    // Echec bruyant : une lecture qui renvoie silencieusement une liste vide
    // ferait croire que tout est deja traite.
    console.error(`Lecture de la CVtheque impossible (${res.status}) : ${await res.text()}`);
    process.exit(1);
  }
  const rows = (await res.json()) as Row[];
  console.log(`${rows.length} fiche(s) sans texte analyse.`);

  let done = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const label = `${row.file_name || row.file_path}`.slice(0, 60);
    try {
      const dl = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${row.bucket}/${encodeURI(row.file_path)}`,
        { headers },
      );
      if (!dl.ok) { console.warn(`  ✗ ${label} — telechargement ${dl.status}`); failed++; continue; }

      const buf = Buffer.from(await dl.arrayBuffer());
      const text = await extractTextNode(buf, row.file_name || row.file_path, row.file_type);
      if (!text.trim()) { console.warn(`  – ${label} — format non exploitable`); skipped++; continue; }

      const parsed = parseFields(text);

      // On ne remplit que les trous : une correction faite a la main dans
      // l'admin ne doit jamais etre effacee par un passage du script.
      const patch: Record<string, unknown> = {
        raw_text: parsed.raw_text,
        ville: row.ville || parsed.ville || null,
        quartier: row.quartier || parsed.quartier || null,
        diplome: row.diplome || parsed.diplome || null,
        niveau_etudes: row.niveau_etudes || parsed.niveau_etudes || null,
        competences: row.competences?.length ? row.competences : parsed.competences,
        langues: row.langues?.length ? row.langues : parsed.langues,
        experience_years: row.experience_years ?? parsed.experience_years,
        keywords: row.keywords?.length ? row.keywords : parsed.keywords,
      };

      if (dryRun) {
        console.log(`  · ${label} → ${parsed.ville || '?'} / ${parsed.niveau_etudes || '?'} / ${parsed.competences.length} compétence(s)`);
        done++;
        continue;
      }

      const up = await fetch(`${SUPABASE_URL}/rest/v1/cvtheque?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!up.ok) { console.warn(`  ✗ ${label} — ecriture ${up.status}`); failed++; continue; }

      console.log(`  ✓ ${label} → ${parsed.ville || '?'} / ${parsed.competences.length} compétence(s)`);
      done++;
    } catch (e: any) {
      console.warn(`  ✗ ${label} — ${String(e?.message || e).slice(0, 120)}`);
      failed++;
    }
  }

  console.log(`\nTermine : ${done} traitee(s), ${skipped} ignoree(s) (format), ${failed} en echec.`);
  if (dryRun) console.log('(--dry-run : aucune ecriture)');
}

main().catch((e) => { console.error(e); process.exit(1); });
