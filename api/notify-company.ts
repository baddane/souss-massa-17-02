import type { IncomingMessage, ServerResponse } from 'http';
import nodemailer from 'nodemailer';

// Email envoye a une entreprise quand l'admin valide son compte.
// Securite : on n'envoie QUE si l'email correspond a un compte entreprise
// dont le statut est 'valide' (verifie cote Supabase).
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';
const SITE_URL = 'https://soussmassa-rh.com';

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

  const gmailUser = process.env.GMAIL_USER || 'r.baddane@gmail.com';
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailAppPassword) return json(500, { error: 'Email service not configured' });

  try {
    const { email } = await parseBody(req);
    if (!email || typeof email !== 'string') return json(400, { error: 'Email requis' });

    // Verifier que c'est bien un compte entreprise valide
    const lookup = await fetch(
      `${SUPABASE_URL}/rest/v1/comptes_entreprise?select=email,nom_entreprise,statut&email=eq.${encodeURIComponent(email)}&statut=eq.valide`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    const rows = lookup.ok ? await lookup.json() : [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return json(400, { error: 'Aucun compte entreprise validé pour cet email' });
    }
    const nom = rows[0].nom_entreprise || '';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    await transporter.sendMail({
      from: `SoussMassa-RH <${gmailUser}>`,
      to: email,
      subject: 'Votre compte entreprise SoussMassa-RH est activé ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color:#111827;">
          <h2 style="color:#1d4ed8;">Votre compte est activé</h2>
          <p>Bonjour ${nom ? `<strong>${nom}</strong>` : ''},</p>
          <p>Votre compte entreprise sur <strong>SoussMassa-RH</strong> a été validé par notre équipe.
          Vous pouvez dès maintenant vous connecter pour publier vos offres d'emploi.</p>
          <table style="border-collapse:collapse; margin:16px 0;">
            <tr><td style="padding:6px 10px; color:#6b7280;">Identifiant (email)</td><td style="padding:6px 10px;"><strong>${email}</strong></td></tr>
            <tr><td style="padding:6px 10px; color:#6b7280;">Mot de passe</td><td style="padding:6px 10px;">celui que vous avez choisi à l'inscription</td></tr>
          </table>
          <p>
            <a href="${SITE_URL}/connexion-entreprise"
               style="display:inline-block; background:#1d4ed8; color:#fff; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:bold;">
              Se connecter
            </a>
          </p>
          <p style="font-size:13px; color:#6b7280;">Chaque offre publiée est vérifiée par notre équipe avant sa mise en ligne.</p>
          <p style="font-size:13px; color:#6b7280;">— L'équipe SoussMassa-RH</p>
        </div>`,
    });

    return json(200, { ok: true });
  } catch (err: any) {
    console.error('notify-company error:', err);
    return json(500, { error: String(err?.message || err) });
  }
}
