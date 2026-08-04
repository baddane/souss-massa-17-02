import type { IncomingMessage, ServerResponse } from 'http';

// Envoi d'e-mails de prospection aux entreprises, via Brevo (transactional API).
// Sécurité : réservé à l'admin. On exige le jeton de session Supabase de
// l'appelant et on vérifie public.is_admin() AVANT tout envoi — sinon
// l'endpoint serait un relais de spam ouvert.
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'contact@soussmassa-rh.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'SoussMassa-RH';

interface Target { id: string; email: string; raison_sociale: string; slug: string; ville?: string | null }

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

// Remplace les jetons {entreprise} {ville} {slug} {url} dans un gabarit.
function fill(tpl: string, t: Target): string {
  const url = `https://www.soussmassa-rh.com/recrutement/${t.slug}`;
  return tpl
    .replace(/\{entreprise\}/g, esc(t.raison_sociale))
    .replace(/\{ville\}/g, esc(t.ville || 'Souss-Massa'))
    .replace(/\{slug\}/g, esc(t.slug))
    .replace(/\{url\}/g, url);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const json = (status: number, obj: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const brevoKey = process.env.BREVO_API_KEY;
  if (!brevoKey) return json(500, { error: "BREVO_API_KEY non configurée (Vercel → Settings → Environment Variables)." });

  try {
    const { access_token, targets, subject, htmlTemplate } = await parseBody(req);

    if (!access_token || typeof access_token !== 'string') return json(401, { error: 'Non authentifié' });
    if (!Array.isArray(targets) || targets.length === 0) return json(400, { error: 'Aucune cible sélectionnée' });
    if (!subject || !htmlTemplate) return json(400, { error: 'Objet et contenu requis' });
    if (targets.length > 200) return json(400, { error: 'Trop de destinataires en une fois (max 200)' });

    // 1) Vérifier que l'appelant est admin (is_admin() sous le jeton de l'appelant)
    const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const isAdmin = adminRes.ok ? await adminRes.json() : false;
    if (isAdmin !== true) return json(403, { error: 'Accès réservé à l’administrateur' });

    // 2) Envoi séquentiel via Brevo (plan gratuit : ~300/jour, on temporise un peu)
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const t of targets as Target[]) {
      if (!t.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.email)) {
        results.push({ id: t.id, ok: false, error: 'Email invalide' });
        continue;
      }
      try {
        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            sender: { name: SENDER_NAME, email: SENDER_EMAIL },
            to: [{ email: t.email, name: t.raison_sociale }],
            subject: fill(subject, t),
            htmlContent: fill(htmlTemplate, t),
            tags: ['outreach'],
          }),
        });
        if (r.ok) {
          results.push({ id: t.id, ok: true });
        } else {
          let msg = `Brevo ${r.status}`;
          try { const e = await r.json(); msg = e?.message || msg; } catch { /* noop */ }
          results.push({ id: t.id, ok: false, error: msg });
        }
      } catch (e: any) {
        results.push({ id: t.id, ok: false, error: String(e?.message || e) });
      }
      await sleep(120);
    }

    const sent = results.filter((x) => x.ok).length;
    return json(200, { ok: true, sent, total: results.length, results });
  } catch (err: any) {
    console.error('send-outreach error:', err);
    return json(500, { error: String(err?.message || err) });
  }
}
