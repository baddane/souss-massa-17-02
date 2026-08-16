import type { IncomingMessage, ServerResponse } from 'http';

// Suppression complete d'un compte entreprise, declenchee depuis l'admin.
//
// Pourquoi cet endpoint : la suppression se faisait cote client par un simple
// DELETE sur `comptes_entreprise`. Le compte `auth.users`, lui, survivait ->
// l'entreprise disparaissait de l'admin mais son email restait reserve dans
// Supabase Auth. Toute nouvelle inscription avec cette adresse echouait
// definitivement sur « User already registered ». On supprime donc les deux.
//
// Securite :
// - L'appelant DOIT etre un admin authentifie (verifie via `is_admin()` avec
//   son propre JWT).
// - La suppression d'un compte present dans `app_admins` est refusee : on ne
//   veut pas qu'une erreur de manipulation efface un compte administrateur.
// - La cle service_role n'est utilisee que cote serveur, jamais exposee.
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

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) return json(500, { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

  try {
    const { id } = await parseBody(req);
    if (!id || typeof id !== 'string') return json(400, { error: 'Identifiant requis' });

    // 1. L'appelant est-il admin ?
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Non authentifié' });
    const isAdminRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      headers: { apikey: SUPABASE_KEY, Authorization: authHeader },
    });
    if (!isAdminRes.ok) return json(401, { error: 'Jeton invalide' });
    if ((await isAdminRes.json()) !== true) return json(403, { error: 'Réservé aux administrateurs' });

    // 2. Garde-fou : ne jamais supprimer un compte administrateur.
    const adminRow = await fetch(
      `${SUPABASE_URL}/rest/v1/app_admins?select=id&id=eq.${encodeURIComponent(id)}`,
      { headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` } },
    );
    const adminRows = adminRow.ok ? await adminRow.json() : [];
    if (Array.isArray(adminRows) && adminRows.length > 0) {
      return json(403, { error: 'Ce compte est un compte administrateur : suppression refusée.' });
    }

    // 3. Supprimer la fiche entreprise (les offres deja publiees sont conservees).
    const delProfile = await fetch(
      `${SUPABASE_URL}/rest/v1/comptes_entreprise?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` } },
    );
    if (!delProfile.ok) {
      const errText = await delProfile.text();
      throw new Error(`Echec suppression du profil (${delProfile.status}): ${errText.slice(0, 200)}`);
    }

    // 4. Supprimer le compte Auth, pour que l'email redevienne utilisable.
    const delUser = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
    });
    // 404 = compte Auth deja absent : la fiche est supprimee, c'est le resultat voulu.
    if (!delUser.ok && delUser.status !== 404) {
      const errText = await delUser.text();
      return json(500, {
        error: `Fiche supprimée, mais le compte Auth subsiste (${delUser.status}): ${errText.slice(0, 200)}. `
          + `Cet email ne pourra pas être réutilisé tant qu'il n'est pas supprimé.`,
      });
    }

    return json(200, { ok: true });
  } catch (err: any) {
    console.error('delete-company error:', err);
    return json(500, { error: String(err?.message || err) });
  }
}
