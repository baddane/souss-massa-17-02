import type { IncomingMessage, ServerResponse } from 'http';
import { sendBrevoEmail, brevoConfigured, BREVO_MISSING_KEY } from './_brevo.js';

// Previent l'entreprise qu'une candidature vient d'arriver sur une de ses offres.
//
// Appele par le formulaire de candidature (visiteur anonyme) juste apres
// l'insertion. Il ne peut donc pas etre protege par une session — la protection
// repose sur trois verrous cote serveur :
//   1. l'id doit correspondre a une candidature REELLE (lue en service_role) ;
//   2. la candidature ne doit pas avoir deja ete notifiee — le drapeau
//      `notified_company` est pose avant l'envoi, ce qui rend l'appel idempotent
//      et bloque tout rejeu ;
//   3. le destinataire est l'entreprise proprietaire de l'offre, jamais une
//      adresse fournie par l'appelant.
// Aucun contenu de la requete n'influence le mail : seul l'identifiant est lu.
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SITE_URL = 'https://www.soussmassa-rh.com';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c: Buffer) => { body += c.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

const esc = (s: string) => String(s || '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
));

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const json = (status: number, obj: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!brevoConfigured()) return json(500, { error: BREVO_MISSING_KEY });

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) return json(500, { error: "SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d'environnement Vercel" });

  const sbHeaders = {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    'Content-Type': 'application/json',
  };

  try {
    const { id } = await parseBody(req);
    if (!id || typeof id !== 'string') return json(400, { error: 'Identifiant requis' });

    // 1. La candidature existe-t-elle, et n'a-t-elle pas deja ete notifiee ?
    const candRes = await fetch(
      `${SUPABASE_URL}/rest/v1/candidatures?select=id,job_ref,job_title,candidate_name,notified_company&id=eq.${encodeURIComponent(id)}`,
      { headers: sbHeaders },
    );
    const cands = candRes.ok ? await candRes.json() : [];
    if (!Array.isArray(cands) || cands.length === 0) return json(404, { error: 'Candidature introuvable' });
    const cand = cands[0];
    if (cand.notified_company) return json(200, { ok: true, alreadyNotified: true });

    // 2. Quelle entreprise possede l'offre ? (pas d'offre rattachee = rien a faire)
    const offRes = await fetch(
      `${SUPABASE_URL}/rest/v1/job_offers?select=company_id,emploi_metier&ref_offre=eq.${encodeURIComponent(cand.job_ref)}`,
      { headers: sbHeaders },
    );
    const offers = offRes.ok ? await offRes.json() : [];
    const companyId = Array.isArray(offers) && offers.length ? offers[0].company_id : null;
    if (!companyId) return json(200, { ok: true, skipped: 'offre sans entreprise rattachee' });

    const compRes = await fetch(
      `${SUPABASE_URL}/rest/v1/comptes_entreprise?select=email,nom_entreprise,statut&id=eq.${encodeURIComponent(companyId)}`,
      { headers: sbHeaders },
    );
    const comps = compRes.ok ? await compRes.json() : [];
    if (!Array.isArray(comps) || comps.length === 0) return json(200, { ok: true, skipped: 'entreprise introuvable' });
    const { email: to, nom_entreprise: nom, statut } = comps[0];
    if (statut !== 'valide') return json(200, { ok: true, skipped: 'entreprise non validee' });

    // 3. Poser le drapeau AVANT d'envoyer : au pire un email est perdu, jamais
    //    dupplique. C'est ce qui rend l'endpoint insensible au rejeu.
    const flag = await fetch(`${SUPABASE_URL}/rest/v1/candidatures?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ notified_company: true }),
    });
    if (!flag.ok) throw new Error(`Marquage impossible (${flag.status})`);

    await sendBrevoEmail({
      to,
      toName: nom || undefined,
      tags: ['nouvelle-candidature'],
      subject: `Nouvelle candidature : ${cand.job_title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color:#111827;">
          <h2 style="color:#1d4ed8;">Vous avez reçu une candidature</h2>
          <p>Bonjour ${nom ? `<strong>${esc(nom)}</strong>` : ''},</p>
          <p><strong>${esc(cand.candidate_name)}</strong> vient de postuler à votre offre
          <strong>${esc(cand.job_title)}</strong>.</p>
          <p>Son CV et ses coordonnées vous attendent dans votre espace entreprise.</p>
          <p style="margin:20px 0;">
            <a href="${SITE_URL}/espace-entreprise"
               style="display:inline-block; background:#1d4ed8; color:#fff; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:bold;">
              Voir la candidature
            </a>
          </p>
          <p style="font-size:13px; color:#6b7280;">— L'équipe SoussMassa-RH</p>
        </div>`,
    });

    return json(200, { ok: true });
  } catch (err: any) {
    console.error('notify-application error:', err);
    return json(500, { error: String(err?.message || err) });
  }
}
