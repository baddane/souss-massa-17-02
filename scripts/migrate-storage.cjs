// Copie les fichiers de stockage d'un projet Supabase vers un autre.
//
// POURQUOI UN SCRIPT, ET POURQUOI C'EST TOI QUI LE LANCES :
// les fichiers ne vivent pas dans Postgres — aucun SQL ne peut les deplacer.
// Il faut passer par l'API Storage, donc par les cles `service_role` des DEUX
// projets. Ces cles ne doivent transiter par aucune conversation : elles restent
// dans ton terminal.
//
// LE POINT CRITIQUE : `cvtheque.file_path` et `candidatures.cv_path` stockent
// des CHEMINS. Un seul chemin qui change et le CV devient introuvable — pour
// 112 profils et 271 candidatures. Le script recopie donc chaque objet sous
// EXACTEMENT le meme chemin, et refuse de continuer s'il constate une divergence.
//
// UTILISATION :
//   export SRC_URL='https://tqrhxhoqqktnhttzmoqt.supabase.co'
//   export SRC_KEY='<service_role du projet SOURCE>'
//   export DST_URL='https://<nouveau-ref>.supabase.co'
//   export DST_KEY='<service_role du projet CIBLE>'
//   node scripts/migrate-storage.cjs --dry-run     # inventaire, aucune ecriture
//   node scripts/migrate-storage.cjs               # copie reelle
//   node scripts/migrate-storage.cjs --verify      # recompte les deux cotes
//
// Le script est REJOUABLE : un fichier deja present cote cible est saute.
// Il ne supprime jamais rien, ni a la source ni a la cible.

const BUCKETS = ['cvs', 'cvtheque'];
const PAGE = 100;

const need = (k) => {
  const v = (process.env[k] || '').trim();
  if (!v) { console.error(`Variable d'environnement manquante : ${k}`); process.exit(1); }
  return v;
};
const SRC_URL = need('SRC_URL').replace(/\/$/, '');
const SRC_KEY = need('SRC_KEY');
const DST_URL = need('DST_URL').replace(/\/$/, '');
const DST_KEY = need('DST_KEY');

const dryRun = process.argv.includes('--dry-run');
const verifyOnly = process.argv.includes('--verify');

const h = (key, extra = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, ...extra });

// L'API `list` ne descend pas dans les sous-dossiers : les CV sont ranges par
// reference d'offre (`RK-1234/fichier.pdf`), il faut donc parcourir l'arbre.
async function listAll(url, key, bucket, prefix = '') {
  const out = [];
  let offset = 0;
  for (;;) {
    const r = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: h(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix, limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!r.ok) throw new Error(`list ${bucket}/${prefix} : ${r.status} ${await r.text()}`);
    const rows = await r.json();
    if (!rows.length) break;
    for (const row of rows) {
      const path = prefix ? `${prefix}/${row.name}` : row.name;
      // Un « dossier » n'a pas de metadata : on descend dedans.
      if (row.id === null || !row.metadata) out.push(...await listAll(url, key, bucket, path));
      else out.push({ path, size: Number(row.metadata.size || 0), type: row.metadata.mimetype });
    }
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function ensureBucket(bucket) {
  const r = await fetch(`${DST_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: h(DST_KEY, { 'Content-Type': 'application/json' }),
    // PRIVE, comme la source. Un bucket public exposerait tous les CV.
    body: JSON.stringify({ id: bucket, name: bucket, public: false }),
  });
  if (r.ok) { console.log(`  bucket « ${bucket} » cree (prive)`); return; }
  const txt = await r.text();
  if (/already exists|Duplicate/i.test(txt)) return;
  throw new Error(`creation du bucket ${bucket} : ${r.status} ${txt}`);
}

async function copyOne(bucket, obj, existing) {
  if (existing.has(obj.path)) return 'deja-present';

  const dl = await fetch(`${SRC_URL}/storage/v1/object/${bucket}/${encodeURI(obj.path)}`, { headers: h(SRC_KEY) });
  if (!dl.ok) return `ECHEC telechargement ${dl.status}`;
  const body = Buffer.from(await dl.arrayBuffer());

  if (body.length !== obj.size && obj.size > 0) return `ECHEC taille (${body.length} vs ${obj.size})`;

  const up = await fetch(`${DST_URL}/storage/v1/object/${bucket}/${encodeURI(obj.path)}`, {
    method: 'POST',
    headers: h(DST_KEY, { 'Content-Type': obj.type || 'application/octet-stream' }),
    body,
  });
  if (!up.ok) return `ECHEC envoi ${up.status} ${(await up.text()).slice(0, 120)}`;
  return 'copie';
}

(async () => {
  if (SRC_URL === DST_URL) { console.error('SRC_URL et DST_URL sont identiques — arret.'); process.exit(1); }
  console.log(`Source : ${SRC_URL}\nCible  : ${DST_URL}\n`);

  let totalSrc = 0, totalDst = 0, copies = 0, sautes = 0;
  const echecs = [];

  for (const bucket of BUCKETS) {
    const src = await listAll(SRC_URL, SRC_KEY, bucket);
    totalSrc += src.length;
    const mo = (src.reduce((s, o) => s + o.size, 0) / 1048576).toFixed(1);
    console.log(`Bucket « ${bucket} » : ${src.length} fichier(s), ${mo} Mo`);

    if (dryRun) continue;

    await ensureBucket(bucket);
    const dst = await listAll(DST_URL, DST_KEY, bucket).catch(() => []);
    const existing = new Set(dst.map((o) => o.path));

    if (verifyOnly) { totalDst += dst.length; console.log(`  cible : ${dst.length} fichier(s)`); continue; }

    for (const obj of src) {
      const res = await copyOne(bucket, obj, existing);
      if (res === 'copie') copies++;
      else if (res === 'deja-present') sautes++;
      else { echecs.push(`${bucket}/${obj.path} — ${res}`); console.warn(`  ✗ ${obj.path} : ${res}`); }
    }
    console.log(`  → ${copies} copie(s), ${sautes} deja present(s)`);
  }

  if (dryRun) { console.log(`\nInventaire seul : ${totalSrc} fichier(s). Aucune ecriture.`); return; }
  if (verifyOnly) {
    console.log(`\nSource ${totalSrc} · Cible ${totalDst} — ${totalSrc === totalDst ? 'IDENTIQUE ✅' : 'DIVERGENCE ❌'}`);
    process.exit(totalSrc === totalDst ? 0 : 1);
  }

  console.log(`\nTermine : ${copies} copie(s), ${sautes} deja present(s), ${echecs.length} echec(s).`);
  if (echecs.length) { echecs.forEach((e) => console.error('  ' + e)); process.exit(1); }
  console.log('Relance avec --verify pour recompter les deux cotes.');
})().catch((e) => { console.error(e); process.exit(1); });
