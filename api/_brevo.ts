// Envoi d'e-mails transactionnels via Brevo, partage par les fonctions de api/.
// (Le prefixe « _ » empeche Vercel de traiter ce fichier comme une route.)
//
// Le site est passe a Brevo : plus aucun envoi ne doit passer par Gmail /
// nodemailer. L'expediteur `contact@soussmassa-rh.com` doit etre valide dans
// Brevo, et BREVO_API_KEY renseignee dans Vercel → Settings → Environment
// Variables.
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'contact@soussmassa-rh.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'SoussMassa-RH';

export interface BrevoMail {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  replyTo?: string;
  /** Pieces jointes : `content` en base64 (avec ou sans prefixe data:). */
  attachments?: { name: string; content: string }[];
  tags?: string[];
}

/** Message d'erreur pret a afficher quand la cle n'est pas configuree. */
export const BREVO_MISSING_KEY =
  "BREVO_API_KEY non configurée (Vercel → Settings → Environment Variables).";

export function brevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

/**
 * Cree ou met a jour un contact Brevo (CRM). `updateEnabled` rend l'appel
 * idempotent : rejouer l'inscription ou la validation met simplement le contact
 * a jour.
 *
 * Volontairement NON bloquant : une panne de la synchro CRM ne doit jamais
 * empecher l'envoi d'un email ni faire echouer une inscription. Les erreurs
 * sont tracees, pas propagees.
 *
 * NB : cela n'a aucun effet sur la delivrabilite. Le placement en spam se joue
 * sur l'authentification du domaine (SPF + DKIM), pas sur les listes de contacts.
 */
export async function upsertBrevoContact(
  email: string,
  attributes: Record<string, unknown> = {},
  extraListIds: number[] = [],
): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return;

  const listEnv = Number(process.env.BREVO_COMPANY_LIST_ID || '');
  const listIds = [...extraListIds, ...(Number.isFinite(listEnv) && listEnv > 0 ? [listEnv] : [])];

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        email,
        attributes,
        updateEnabled: true,
        ...(listIds.length ? { listIds } : {}),
      }),
    });
    if (!r.ok && r.status !== 204) {
      const detail = await r.text().catch(() => '');
      console.error(`Brevo contact ${email} : ${r.status} ${detail.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(`Brevo contact ${email} :`, err);
  }
}

export async function sendBrevoEmail(mail: BrevoMail): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error(BREVO_MISSING_KEY);

  const body: Record<string, unknown> = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: mail.to, ...(mail.toName ? { name: mail.toName } : {}) }],
    subject: mail.subject,
    htmlContent: mail.html,
  };
  if (mail.replyTo) body.replyTo = { email: mail.replyTo };
  if (mail.tags?.length) body.tags = mail.tags;
  if (mail.attachments?.length) {
    body.attachment = mail.attachments.map((a) => ({
      name: a.name,
      // Brevo attend du base64 nu : on retire un eventuel prefixe data:...;base64,
      content: a.content.replace(/^data:[^;]*;base64,/, ''),
    }));
  }

  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    let detail = `Brevo ${r.status}`;
    try {
      const e = await r.json();
      if (e?.message) detail = `Brevo ${r.status} : ${e.message}`;
    } catch { /* reponse non JSON */ }
    throw new Error(detail);
  }
}
