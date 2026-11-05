import type { IncomingMessage, ServerResponse } from 'http';
import { sendBrevoEmail } from './_brevo.js';
import { corpsMessage, texteMessage } from './_gabarit.js';

// Envoi d'un message de la file « Messages préparés » (table `outbox`).
//
// - Reserve a l'admin : jeton de session + `is_admin()`, sinon relais ouvert.
// - Le destinataire, l'objet et le texte sont LUS EN BASE : le client n'envoie
//   que l'identifiant de la ligne. On ne peut pas detourner l'endpoint vers
//   une autre adresse.
// - La ligne est RESERVEE avant l'envoi (a_envoyer -> envoi_en_cours, en une
//   seule requete conditionnelle) : deux clics ou deux onglets ne produisent
//   jamais deux e-mails. Si Brevo refuse, la ligne retourne dans la file avec
//   l'erreur.
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';

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

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) return json(500, { error: "SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d'environnement Vercel" });
  const sb = { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, 'Content-Type': 'application/json' };

  try {
    const token = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!token) return json(401, { error: 'Authentification requise' });
    const adm = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: serviceRole, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!(adm.ok && (await adm.json()) === true)) return json(403, { error: 'Réservé à l’administrateur' });

    const body = await parseBody(req);
    const id = String(body.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { error: 'id requis' });

    // Reservation : ne passe que si la ligne est encore « a_envoyer ».
    const r = await fetch(`${SUPABASE_URL}/rest/v1/outbox?id=eq.${id}&statut=eq.a_envoyer`, {
      method: 'PATCH', headers: { ...sb, Prefer: 'return=representation' },
      body: JSON.stringify({ statut: 'envoi_en_cours', erreur: null }),
    });
    const [ligne] = r.ok ? await r.json() : [];
    if (!ligne) return json(409, { error: 'Message déjà envoyé, abandonné ou en cours d’envoi.' });

    const maj = (patch: Record<string, unknown>) => fetch(`${SUPABASE_URL}/rest/v1/outbox?id=eq.${id}`, {
      method: 'PATCH', headers: { ...sb, Prefer: 'return=minimal' }, body: JSON.stringify(patch),
    });

    try {
      await sendBrevoEmail({
        to: ligne.to_email,
        toName: ligne.to_name || undefined,
        subject: ligne.subject,
        html: corpsMessage(ligne.body),
        text: texteMessage(ligne.body),
        replyTo: 'contact@soussmassa-rh.com',
        tags: ['outbox'],
      });
    } catch (e: any) {
      const erreur = String(e?.message || e).slice(0, 300);
      await maj({ statut: 'a_envoyer', erreur });
      return json(502, { error: erreur });
    }
    await maj({ statut: 'envoye', sent_at: new Date().toISOString() });
    return json(200, { ok: true, id, to: ligne.to_email });
  } catch (e: any) {
    return json(500, { error: String(e?.message || e) });
  }
}
