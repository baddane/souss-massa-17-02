import type { IncomingMessage, ServerResponse } from 'http';
import { randomBytes } from 'crypto';
import { sendBrevoEmail, brevoConfigured, BREVO_MISSING_KEY } from './_brevo.js';

// Email envoye a une entreprise quand l'admin valide son compte :
// confirmation + identifiants (login + mot de passe temporaire).
//
// Securite :
// - L'appelant DOIT etre un admin authentifie : son JWT Supabase est verifie
//   via la fonction RPC `is_admin()` (sinon 401/403).
// - Supabase ne conserve pas les mots de passe en clair : un mot de passe
//   temporaire est genere ici, positionne sur le compte via l'API Admin
//   (cle service_role, jamais exposee au client), puis envoye par email.
// - On n'envoie QUE si l'email correspond a un compte entreprise dont le
//   statut est 'valide' (verifie cote Supabase).
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';
const SITE_URL = 'https://www.soussmassa-rh.com';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c: Buffer) => { body += c.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

// Mot de passe temporaire lisible : 10 caracteres sans ambiguite (pas de 0/O, 1/l/I)
function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const buf = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += alphabet[buf[i] % alphabet.length];
  return `Ssm-${out.slice(0, 5)}-${out.slice(5)}`;
}

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

  try {
    const { email } = await parseBody(req);
    if (!email || typeof email !== 'string') return json(400, { error: 'Email requis' });

    // 1. Verifier que l'appelant est bien un admin authentifie
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Non authentifié' });
    const isAdminRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      headers: { apikey: SUPABASE_KEY, Authorization: authHeader },
    });
    if (!isAdminRes.ok) return json(401, { error: 'Jeton invalide' });
    const isAdmin = await isAdminRes.json();
    if (isAdmin !== true) return json(403, { error: 'Réservé aux administrateurs' });

    // 2. Verifier que c'est bien un compte entreprise valide
    const lookup = await fetch(
      `${SUPABASE_URL}/rest/v1/comptes_entreprise?select=id,email,nom_entreprise,statut&email=eq.${encodeURIComponent(email)}&statut=eq.valide`,
      { headers: { apikey: SUPABASE_KEY, Authorization: authHeader } },
    );
    const rows = lookup.ok ? await lookup.json() : [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return json(400, { error: 'Aucun compte entreprise validé pour cet email' });
    }
    const { id: userId, nom_entreprise: nom } = rows[0];

    // 3. Generer un mot de passe temporaire et le positionner sur le compte
    //    (l'ancien mot de passe choisi a l'inscription est remplace)
    const password = generateTempPassword();
    const updateUser = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    if (!updateUser.ok) {
      const errText = await updateUser.text();
      throw new Error(`Echec mise à jour du mot de passe (${updateUser.status}): ${errText.slice(0, 200)}`);
    }

    // 4. Envoyer l'email de confirmation avec les identifiants (via Brevo)
    await sendBrevoEmail({
      to: email,
      toName: nom || undefined,
      tags: ['compte-entreprise-valide'],
      subject: 'Votre compte entreprise SoussMassa-RH est activé ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color:#111827;">
          <h2 style="color:#1d4ed8;">Votre compte est activé</h2>
          <p>Bonjour ${nom ? `<strong>${nom}</strong>` : ''},</p>
          <p>Votre compte entreprise sur <strong>SoussMassa-RH</strong> a été validé par notre équipe.
          Vous pouvez dès maintenant vous connecter pour publier vos offres d'emploi.</p>
          <p style="margin:16px 0 8px;"><strong>Vos identifiants de connexion :</strong></p>
          <table style="border-collapse:collapse; margin:8px 0 16px;">
            <tr><td style="padding:6px 10px; color:#6b7280;">Identifiant (email)</td><td style="padding:6px 10px;"><strong>${email}</strong></td></tr>
            <tr><td style="padding:6px 10px; color:#6b7280;">Mot de passe</td><td style="padding:6px 10px;"><strong style="letter-spacing:1px;">${password}</strong></td></tr>
          </table>
          <p>
            <a href="${SITE_URL}/connexion-entreprise"
               style="display:inline-block; background:#1d4ed8; color:#fff; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:bold;">
              Se connecter
            </a>
          </p>
          <p style="background:#fef3c7; border-left:4px solid #f59e0b; padding:10px 14px; font-size:13px; color:#92400e; margin:16px 0;">
            <strong>Important :</strong> ce mot de passe remplace tout mot de passe reçu précédemment.
            Si vous avez reçu plusieurs emails, seul celui-ci est valide — les précédents ne fonctionnent plus.
          </p>
          <p style="font-size:13px; color:#6b7280; margin-top:16px;">Chaque offre publiée est vérifiée par notre équipe avant sa mise en ligne.</p>
          <p style="font-size:13px; color:#6b7280;">— L'équipe SoussMassa-RH</p>
        </div>`,
    });

    return json(200, { ok: true });
  } catch (err: any) {
    console.error('notify-company error:', err);
    return json(500, { error: String(err?.message || err) });
  }
}
