import type { IncomingMessage, ServerResponse } from 'http';
import { upsertBrevoContact } from './_brevo.js';

// Enregistre une entreprise qui vient de s'inscrire comme contact (lead) Brevo.
//
// Securite : l'appelant doit fournir le jeton de session du compte tout juste
// cree, et le contact est cree POUR L'EMAIL DE CE JETON — jamais pour un email
// arbitraire passe dans le corps de la requete. Sans cela, l'endpoint serait un
// injecteur de contacts ouvert.
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c: Buffer) => { body += c.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const json = (status: number, obj: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Non authentifié' });

    // L'email vient du jeton, jamais du corps de la requete.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: authHeader },
    });
    if (!userRes.ok) return json(401, { error: 'Jeton invalide' });
    const user = await userRes.json();
    const email = String(user?.email || '');
    if (!email) return json(400, { error: 'Compte sans email' });

    const { nom_entreprise, telephone, ville, secteur } = await parseBody(req);

    await upsertBrevoContact(email, {
      NOM_ENTREPRISE: nom_entreprise || '',
      TELEPHONE: telephone || '',
      VILLE: ville || '',
      SECTEUR: secteur || '',
      STATUT_COMPTE: 'en_attente',
      SOURCE: 'inscription-entreprise',
    });

    return json(200, { ok: true });
  } catch (err: any) {
    console.error('company-lead error:', err);
    return json(500, { error: String(err?.message || err) });
  }
}
