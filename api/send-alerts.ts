import type { IncomingMessage, ServerResponse } from 'http';
import { sendBrevoEmail, brevoConfigured, BREVO_MISSING_KEY } from './_brevo.js';

// Alertes emploi : envoie a chaque candidat les nouvelles offres correspondant
// a ses criteres. Declenche par le cron Vercel (vercel.json > crons), une fois
// par jour ; les alertes hebdomadaires ne partent que si la derniere date de
// plus de six jours et demi.
//
// PROTECTION CONTRE LE REJEU : `last_sent_at` est pose AVANT l'envoi et fait
// office de verrou. Un appel repete ne renvoie donc rien — c'est ce qui rend
// l'endpoint inoffensif meme s'il est appele depuis l'exterieur.
//
// AUTHENTIFICATION : Vercel envoie `Authorization: Bearer $CRON_SECRET` sur les
// invocations cron des que la variable CRON_SECRET existe. Si elle n'est pas
// definie, on accepte quand meme l'appel — le verrou ci-dessus fait qu'au pire
// un tiers declenche un envoi que le cron aurait fait quelques heures plus tard.

const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SITE_URL = 'https://www.soussmassa-rh.com';

const DAY = 24 * 60 * 60 * 1000;
// 20 h et non 24 h : le cron ne tombe jamais a la seconde pres, et un decalage
// de quelques minutes ne doit pas repousser l'alerte au lendemain.
const DELAY_DAILY = 20 * 60 * 60 * 1000;
const DELAY_WEEKLY = 6.5 * DAY;
const MAX_OFFERS_PER_MAIL = 8;

interface Alert {
  id: string;
  email: string;
  intitule: string | null;
  ville: string | null;
  type_contrat: string | null;
  frequence: 'quotidienne' | 'hebdomadaire';
  last_sent_at: string | null;
  candidats?: { nom_complet: string | null; actif: boolean } | null;
}

interface Offer {
  slug: string;
  emploi_metier: string;
  ville: string;
  type_contrat: string;
  raison_sociale: string;
  date_offre: string;
  created_at: string;
  required_skills: string[] | null;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

// Comparaison insensible aux accents : « Aït Melloul » saisi « ait melloul »
// doit correspondre, sinon la moitie des alertes ne remonterait rien.
const norm = (s: unknown) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function matches(alert: Alert, offer: Offer): boolean {
  if (alert.ville && norm(offer.ville) !== norm(alert.ville)) return false;
  if (alert.type_contrat && norm(offer.type_contrat) !== norm(alert.type_contrat)) return false;
  if (alert.intitule) {
    const needle = norm(alert.intitule);
    const haystack = norm(
      `${offer.emploi_metier} ${offer.raison_sociale} ${(offer.required_skills || []).join(' ')}`,
    );
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function isDue(alert: Alert, now: number): boolean {
  if (!alert.last_sent_at) return true;
  const last = new Date(alert.last_sent_at).getTime();
  if (isNaN(last)) return true;
  return now - last >= (alert.frequence === 'hebdomadaire' ? DELAY_WEEKLY : DELAY_DAILY);
}

function mailHtml(name: string | null, offers: Offer[]): string {
  const rows = offers.map((o) => `
    <tr><td style="padding:12px 0; border-bottom:1px solid #e5e7eb;">
      <a href="${SITE_URL}/emploi/${encodeURIComponent(o.slug)}"
         style="color:#1d4ed8; font-weight:bold; font-size:16px; text-decoration:none;">
        ${esc(o.emploi_metier)}
      </a>
      <div style="color:#4b5563; font-size:14px; margin-top:3px;">
        ${esc(o.raison_sociale)} · ${esc(o.ville)} · ${esc(o.type_contrat)}
      </div>
    </td></tr>`).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; color:#111827;">
      <h2 style="color:#1d4ed8; margin-bottom:4px;">
        ${offers.length} nouvelle${offers.length > 1 ? 's' : ''} offre${offers.length > 1 ? 's' : ''} pour vous
      </h2>
      <p style="color:#4b5563;">Bonjour ${name ? `<strong>${esc(name)}</strong>` : ''},</p>
      <table style="width:100%; border-collapse:collapse;">${rows}</table>
      <p style="margin:24px 0;">
        <a href="${SITE_URL}/offres"
           style="display:inline-block; background:#f97316; color:#fff; text-decoration:none;
                  padding:12px 22px; border-radius:10px; font-weight:bold;">
          Voir toutes les offres
        </a>
      </p>
      <p style="font-size:12px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:12px;">
        Vous recevez cet email parce que vous avez créé une alerte sur SoussMassa-RH.
        <a href="${SITE_URL}/espace-candidat" style="color:#6b7280;">Gérer ou supprimer mes alertes</a>.
      </p>
    </div>`;
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c: Buffer) => { body += c.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const json = (status: number, obj: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = String(req.headers['authorization'] || '');
    if (auth !== `Bearer ${cronSecret}`) return json(401, { error: 'Non autorisé' });
  }

  if (!brevoConfigured()) return json(500, { error: BREVO_MISSING_KEY });
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) {
    return json(500, { error: "SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d'environnement Vercel" });
  }

  const sb = {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    'Content-Type': 'application/json',
  };

  try {
    const { dryRun } = req.method === 'POST' ? await parseBody(req) : { dryRun: false };
    const now = Date.now();

    // 1. Alertes actives de candidats encore en recherche.
    const aRes = await fetch(
      `${SUPABASE_URL}/rest/v1/job_alerts` +
      `?select=id,email,intitule,ville,type_contrat,frequence,last_sent_at,candidats(nom_complet,actif)` +
      `&actif=eq.true`,
      { headers: sb },
    );
    if (!aRes.ok) throw new Error(`Lecture des alertes impossible (${aRes.status})`);
    const alerts = (await aRes.json()) as Alert[];
    const due = alerts.filter((a) => a.candidats?.actif !== false && isDue(a, now));
    if (due.length === 0) return json(200, { ok: true, alerts: alerts.length, sent: 0 });

    // 2. Offres publiees recemment. On borne a 8 jours : au-dela, une offre
    //    n'est plus une nouveaute, et l'alerte hebdomadaire couvre 7 jours.
    const since = new Date(now - 8 * DAY).toISOString();
    const oRes = await fetch(
      `${SUPABASE_URL}/rest/v1/job_offers` +
      `?select=slug,emploi_metier,ville,type_contrat,raison_sociale,date_offre,created_at,required_skills` +
      `&statut=eq.active&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc`,
      { headers: sb },
    );
    if (!oRes.ok) throw new Error(`Lecture des offres impossible (${oRes.status})`);
    const recent = (await oRes.json()) as Offer[];
    if (recent.length === 0) return json(200, { ok: true, alerts: alerts.length, offers: 0, sent: 0 });

    let sent = 0;
    const errors: string[] = [];

    for (const alert of due) {
      // On ne renvoie que ce qui est arrive DEPUIS le dernier envoi.
      const floor = alert.last_sent_at ? new Date(alert.last_sent_at).getTime() : now - 8 * DAY;
      const found = recent
        .filter((o) => new Date(o.created_at).getTime() > floor && matches(alert, o))
        .slice(0, MAX_OFFERS_PER_MAIL);

      if (found.length === 0) continue;
      if (dryRun) { sent += 1; continue; }

      // Verrou avant envoi : au pire un email est perdu, jamais duplique.
      const lock = await fetch(`${SUPABASE_URL}/rest/v1/job_alerts?id=eq.${alert.id}`, {
        method: 'PATCH',
        headers: { ...sb, Prefer: 'return=minimal' },
        body: JSON.stringify({ last_sent_at: new Date().toISOString() }),
      });
      if (!lock.ok) { errors.push(`verrou ${alert.id} (${lock.status})`); continue; }

      try {
        await sendBrevoEmail({
          to: alert.email,
          toName: alert.candidats?.nom_complet || undefined,
          tags: ['alerte-emploi'],
          subject: found.length === 1
            ? `Nouvelle offre : ${found[0].emploi_metier} — ${found[0].ville}`
            : `${found.length} nouvelles offres pour vous`,
          html: mailHtml(alert.candidats?.nom_complet || null, found),
        });
        sent += 1;
      } catch (e: any) {
        errors.push(`${alert.email} : ${String(e?.message || e).slice(0, 120)}`);
      }
    }

    return json(200, { ok: true, alerts: alerts.length, due: due.length, offers: recent.length, sent, errors });
  } catch (err: any) {
    console.error('send-alerts error:', err);
    return json(500, { error: String(err?.message || err) });
  }
}
