import type { IncomingMessage, ServerResponse } from 'http';
import { randomBytes } from 'crypto';

// Provisionne des comptes entreprise prets a l'emploi pour les societes qui
// recrutent deja sur la plateforme, et leur rattache leurs offres existantes.
//
// PREREQUIS INCONTOURNABLE : une adresse email. Un compte Supabase Auth EST une
// adresse email — sans elle, aucun identifiant utilisable, et rien a envoyer.
// Aucun scraper ne capture d'email et `job_offers` n'a pas la colonne : la seule
// source est `outreach_targets.email`, saisie a la main dans l'admin. Le
// provisionnement se limite donc aux entreprises pour lesquelles on en a une.
//
// APPELANTS AUTORISES :
//   - l'admin authentifie (verification `is_admin()` avec SON jeton) ;
//   - un appel machine porteur de CRON_SECRET (cron Vercel, fin d'import).
// Sans l'un des deux, 401. Un endpoint qui cree des comptes ne peut pas etre
// ouvert.

const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';

// Noms qui ne designent PAS une societe identifiable. Les rattacher ferait
// tomber les offres de plusieurs employeurs differents dans un meme compte —
// et donc les CV et coordonnees de leurs candidats. « Entreprise confidentielle »
// couvre a elle seule 68 offres de societes distinctes.
const NOMS_NON_PROVISIONNABLES = [
  /confidentiel/i,
  /^x+$/i,
  /^anonyme$/i,
  /^(entreprise|societe|société|company)$/i,
  /^(n\/?a|nc|-{1,})$/i,
];
const NOM_LONGUEUR_MAX = 60;   // au-dela, c'est une annonce recopiee, pas un nom

function nomProvisionnable(nom: string): boolean {
  const n = (nom || '').trim();
  if (n.length < 3 || n.length > NOM_LONGUEUR_MAX) return false;
  return !NOMS_NON_PROVISIONNABLES.some((rx) => rx.test(n));
}

// Domaine des identifiants techniques. Sous-domaine volontairement INEXISTANT :
// sans enregistrement MX, un envoi echoue immediatement chez l'expediteur au
// lieu d'etre avale silencieusement par le routage email du domaine principal.
const DOMAINE_TECHNIQUE = 'comptes.soussmassa-rh.com';

export function estEmailTechnique(email: string): boolean {
  return (email || '').toLowerCase().endsWith(`@${DOMAINE_TECHNIQUE}`);
}

// Identifiant fabrique a partir des initiales de la raison sociale et de
// l'annee : « BEST PROFIL » -> bp2026@comptes.soussmassa-rh.com.
// Les collisions sont inevitables (deux societes peuvent partager leurs
// initiales) : un suffixe numerique est ajoute jusqu'a obtenir un identifiant
// libre.
function initiales(nom: string): string {
  const mots = (nom || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/).filter(Boolean);
  const ini = mots.map((m) => m[0]).join('').toLowerCase().slice(0, 4);
  return ini || 'ent';
}

function emailTechnique(nom: string, pris: Set<string>): string {
  const base = `${initiales(nom)}${new Date().getFullYear()}`;
  let candidat = `${base}@${DOMAINE_TECHNIQUE}`;
  let n = 2;
  while (pris.has(candidat.toLowerCase())) {
    candidat = `${base}-${n}@${DOMAINE_TECHNIQUE}`;
    n += 1;
  }
  pris.add(candidat.toLowerCase());
  return candidat;
}

function generatePassword(): string {
  // Alphabet sans caracteres ambigus (0/O, 1/l/I) : ces mots de passe sont
  // recopies a la main depuis un email.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const buf = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += alphabet[buf[i] % alphabet.length];
  return `Ssm-${out.slice(0, 5)}-${out.slice(5)}`;
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c: Buffer) => { body += c.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

interface Ctx { sb: Record<string, string>; serviceRole: string; }

async function findUserByEmail(ctx: Ctx, email: string): Promise<string | null> {
  // GoTrue ne propose pas de recherche fiable par email : on parcourt les pages.
  // Borne a 5 x 200 = 1000 comptes, tres au-dela du volume de la plateforme.
  for (let page = 1; page <= 5; page++) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: ctx.serviceRole, Authorization: `Bearer ${ctx.serviceRole}` },
    });
    if (!r.ok) return null;
    const body = await r.json();
    const users = body?.users || [];
    const hit = users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

async function ensureAuthUser(ctx: Ctx, email: string, password: string): Promise<{ id: string; cree: boolean }> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...ctx.sb, apikey: ctx.serviceRole, Authorization: `Bearer ${ctx.serviceRole}` },
    // `email_confirm: true` : le compte est utilisable immediatement, sans que
    // l'entreprise ait a cliquer un lien de confirmation qu'elle n'attend pas.
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (r.ok) return { id: (await r.json()).id, cree: true };

  const detail = await r.text();
  if (!/already|exists|registered/i.test(detail)) {
    throw new Error(`Création du compte ${email} : ${r.status} ${detail.slice(0, 150)}`);
  }

  // Compte deja present : on reprend la main dessus et on lui pose le mot de
  // passe genere, pour que l'identifiant transmis soit exact.
  const id = await findUserByEmail(ctx, email);
  if (!id) throw new Error(`Compte ${email} déjà pris mais introuvable`);
  const upd = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'PUT',
    headers: { ...ctx.sb, apikey: ctx.serviceRole, Authorization: `Bearer ${ctx.serviceRole}` },
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!upd.ok) throw new Error(`Mot de passe non posé pour ${email} : ${upd.status}`);
  return { id, cree: false };
}

async function provisionUne(
  ctx: Ctx,
  cible: { raison_sociale: string; email: string; ville?: string | null; secteur?: string | null },
  origine: 'auto' | 'manuel',
) {
  const nom = cible.raison_sociale.trim();
  const email = cible.email.trim().toLowerCase();
  const fictif = estEmailTechnique(email);
  if (!nomProvisionnable(nom)) return { nom, statut: 'ignoré', raison: 'nom non identifiable' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { nom, statut: 'ignoré', raison: 'email invalide' };

  const password = generatePassword();
  const { id, cree } = await ensureAuthUser(ctx, email, password);

  // Fiche entreprise, directement validee : c'est nous qui provisionnons, il n'y
  // a pas de moderation a attendre.
  const fiche = await fetch(`${SUPABASE_URL}/rest/v1/comptes_entreprise`, {
    method: 'POST',
    headers: { ...ctx.sb, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{
      id, email, nom_entreprise: nom,
      ville: cible.ville || null, secteur: cible.secteur || null,
      statut: 'valide', validated_at: new Date().toISOString(), notified: false,
    }]),
  });
  if (!fiche.ok) throw new Error(`Fiche entreprise ${nom} : ${fiche.status} ${(await fiche.text()).slice(0, 150)}`);

  const cred = await fetch(`${SUPABASE_URL}/rest/v1/company_credentials`, {
    method: 'POST',
    headers: { ...ctx.sb, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ company_id: id, email, mot_de_passe: password, origine, email_fictif: fictif }]),
  });
  if (!cred.ok) throw new Error(`Identifiants ${nom} : ${cred.status} ${(await cred.text()).slice(0, 150)}`);

  // Rattachement des offres : correspondance EXACTE sur la raison sociale, et
  // uniquement celles qui n'ont pas deja un proprietaire.
  const att = await fetch(
    `${SUPABASE_URL}/rest/v1/job_offers?raison_sociale=eq.${encodeURIComponent(nom)}` +
    `&company_id=is.null&statut=eq.active`,
    { method: 'PATCH', headers: { ...ctx.sb, Prefer: 'return=representation' }, body: JSON.stringify({ company_id: id }) },
  );
  const rattachees = att.ok ? ((await att.json()) as any[]).length : 0;

  await fetch(`${SUPABASE_URL}/rest/v1/outreach_targets?raison_sociale=eq.${encodeURIComponent(nom)}`, {
    method: 'PATCH', headers: { ...ctx.sb, Prefer: 'return=minimal' },
    body: JSON.stringify({ statut: 'inscrit' }),
  }).catch(() => { /* la prospection n'est pas critique */ });

  return { nom, email, email_fictif: fictif, statut: cree ? 'créé' : 'mot de passe régénéré', offres_rattachees: rattachees };
}

// Poser un mot de passe sur un compte existant, et le refleter dans la table.
//
// POURQUOI CE MODE EXISTE : si l'admin modifiait `company_credentials` en base,
// le mot de passe REEL du compte Auth ne changerait pas — la liste afficherait
// un identifiant qui ne fonctionne pas. Toute modification doit donc passer par
// l'API Admin, jamais par un simple UPDATE.
async function poserMotDePasse(ctx: Ctx, companyId: string, email: string, choisi?: string) {
  const password = (choisi || '').trim() || generatePassword();
  if (password.length < 8) throw new Error('Mot de passe trop court (8 caractères minimum)');

  const upd = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${companyId}`, {
    method: 'PUT',
    headers: { ...ctx.sb, apikey: ctx.serviceRole, Authorization: `Bearer ${ctx.serviceRole}` },
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!upd.ok) throw new Error(`Mot de passe non posé : ${upd.status} ${(await upd.text()).slice(0, 150)}`);

  const cred = await fetch(`${SUPABASE_URL}/rest/v1/company_credentials`, {
    method: 'POST',
    headers: { ...ctx.sb, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ company_id: companyId, email, mot_de_passe: password, origine: 'manuel' }]),
  });
  if (!cred.ok) throw new Error(`Enregistrement des identifiants : ${cred.status}`);
  return { company_id: companyId, email, mot_de_passe: password, statut: 'mot de passe mis à jour' };
}

// Remplacer l'identifiant d'un compte — typiquement quand on finit par trouver
// la vraie adresse d'une entreprise creee avec un identifiant technique.
// L'email EST le login : il doit changer dans Auth, dans la fiche entreprise et
// dans la table des identifiants, sinon les trois divergent.
async function changerEmail(ctx: Ctx, companyId: string, nouvelEmail: string) {
  const email = nouvelEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Adresse invalide');

  const upd = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${companyId}`, {
    method: 'PUT',
    headers: { ...ctx.sb, apikey: ctx.serviceRole, Authorization: `Bearer ${ctx.serviceRole}` },
    body: JSON.stringify({ email, email_confirm: true }),
  });
  if (!upd.ok) throw new Error(`Changement d'identifiant : ${upd.status} ${(await upd.text()).slice(0, 150)}`);

  // `ce_protect_moderation_fields` fige `email` pour tout appelant qui n'est ni
  // admin ni service_role — on est en service_role, la mise a jour passe.
  await fetch(`${SUPABASE_URL}/rest/v1/comptes_entreprise?id=eq.${companyId}`, {
    method: 'PATCH', headers: { ...ctx.sb, Prefer: 'return=minimal' }, body: JSON.stringify({ email }),
  });
  await fetch(`${SUPABASE_URL}/rest/v1/company_credentials?company_id=eq.${companyId}`, {
    method: 'PATCH', headers: { ...ctx.sb, Prefer: 'return=minimal' },
    body: JSON.stringify({ email, email_fictif: estEmailTechnique(email) }),
  });
  return { company_id: companyId, email, email_fictif: estEmailTechnique(email), statut: 'identifiant mis à jour' };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const json = (status: number, obj: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) return json(500, { error: "SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d'environnement Vercel" });

  const sb = { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, 'Content-Type': 'application/json' };
  const ctx: Ctx = { sb, serviceRole };

  try {
    const body = await parseBody(req);
    const auth = String(req.headers['authorization'] || '');
    const token = auth.replace(/^Bearer\s+/i, '');

    // Autorisation : jeton machine, ou compte admin.
    const cronSecret = process.env.CRON_SECRET;
    let autorise = Boolean(cronSecret && token === cronSecret);
    if (!autorise) {
      if (!token) return json(401, { error: 'Authentification requise' });
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
        method: 'POST',
        headers: { apikey: serviceRole, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      autorise = r.ok && (await r.json()) === true;
    }
    if (!autorise) return json(403, { error: 'Réservé à l’administrateur' });

    if (body.mode === 'email') {
      if (!body.company_id || !body.email) return json(400, { error: 'company_id et email requis' });
      return json(200, { ok: true, ...(await changerEmail(ctx, String(body.company_id), String(body.email))) });
    }

    // Mode « mot de passe » : ne provisionne rien, se contente de (re)poser un
    // mot de passe sur un compte deja existant.
    if (body.mode === 'password') {
      if (!body.company_id || !body.email) return json(400, { error: 'company_id et email requis' });
      const r = await poserMotDePasse(ctx, String(body.company_id), String(body.email), body.mot_de_passe);
      return json(200, { ok: true, ...r });
    }

    const mode = body.mode === 'one' ? 'one' : 'auto';
    let cibles: any[] = [];
    let restantes = 0;

    if (mode === 'one') {
      if (!body.raison_sociale || !body.email) return json(400, { error: 'raison_sociale et email requis' });
      cibles = [body];
    } else {
      // Toutes les entreprises qui ont des offres en ligne et pas encore de
      // compte. L'email reel est repris d'`outreach_targets` quand il existe ;
      // sinon on fabrique un identifiant technique, qui sert de login.
      const [oRes, tRes, cRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/job_offers?select=raison_sociale,ville&statut=eq.active&company_id=is.null`, { headers: sb }),
        fetch(`${SUPABASE_URL}/rest/v1/outreach_targets?select=raison_sociale,email,ville`, { headers: sb }),
        fetch(`${SUPABASE_URL}/rest/v1/comptes_entreprise?select=nom_entreprise,email`, { headers: sb }),
      ]);
      if (!oRes.ok || !tRes.ok || !cRes.ok) throw new Error('Lecture des entreprises impossible');

      const comptes = (await cRes.json()) as any[];
      const dejaNoms = new Set(comptes.map((c) => (c.nom_entreprise || '').trim().toLowerCase()));
      const pris = new Set(comptes.map((c) => (c.email || '').toLowerCase()));
      const emailsConnus = new Map<string, { email: string; ville: string | null }>();
      for (const t of (await tRes.json()) as any[]) {
        if ((t.email || '').trim()) {
          emailsConnus.set((t.raison_sociale || '').trim().toLowerCase(), { email: t.email.trim(), ville: t.ville || null });
        }
      }

      const parNom = new Map<string, { raison_sociale: string; ville: string | null }>();
      for (const o of (await oRes.json()) as any[]) {
        const nom = (o.raison_sociale || '').trim();
        if (!nom || dejaNoms.has(nom.toLowerCase())) continue;
        if (!parNom.has(nom.toLowerCase())) parNom.set(nom.toLowerCase(), { raison_sociale: nom, ville: o.ville || null });
      }

      const toutes = Array.from(parNom.values())
        .filter((e) => nomProvisionnable(e.raison_sociale))
        .map((e) => {
          const connu = emailsConnus.get(e.raison_sociale.toLowerCase());
          if (connu) { pris.add(connu.email.toLowerCase()); return { ...e, email: connu.email }; }
          return { ...e, email: emailTechnique(e.raison_sociale, pris) };
        });

      // TRAITEMENT PAR LOTS. Chaque entreprise demande cinq appels HTTP
      // (creation du compte, fiche, identifiants, rattachement des offres,
      // prospection) : traiter 170 societes d'un coup depasserait largement la
      // duree maximale d'une fonction serverless, et le lot serait perdu en
      // plein milieu. On borne, et on renvoie ce qui reste pour que l'appelant
      // rappelle. L'operation est idempotente — une entreprise deja pourvue
      // d'un compte n'est plus dans la liste au tour suivant.
      const limite = Math.min(Math.max(Number(body.limit) || 20, 1), 50);
      restantes = Math.max(toutes.length - limite, 0);
      cibles = toutes.slice(0, limite);
    }

    const resultats: any[] = [];
    const erreurs: string[] = [];
    for (const c of cibles) {
      try {
        resultats.push(await provisionUne(ctx, c, mode === 'one' ? 'manuel' : 'auto'));
      } catch (e: any) {
        erreurs.push(`${c.raison_sociale} : ${String(e?.message || e).slice(0, 160)}`);
      }
    }

    return json(200, {
      ok: true,
      examinees: cibles.length,
      restantes,
      provisionnees: resultats.filter((r) => r.statut !== 'ignoré').length,
      ignorees: resultats.filter((r) => r.statut === 'ignoré'),
      resultats: resultats.filter((r) => r.statut !== 'ignoré'),
      erreurs,
    });
  } catch (err: any) {
    console.error('provision-companies error:', err);
    return json(500, { error: String(err?.message || err) });
  }
}
