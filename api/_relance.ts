// Relance d'une entreprise DEJA invitee (voir `_invitation.ts`).
//
// Constat du 2026-11-04 : les 12 invitations du 13/09 ont ete delivrees,
// ouvertes, souvent cliquees — et AUCUNE entreprise ne s'est connectee, alors
// que les candidatures continuaient d'arriver sur leurs offres. La relance ne
// renvoie donc PAS d'identifiants : un second message porteur d'un mot de passe,
// envoye a une adresse qui n'a pas reagi au premier, double le risque sans rien
// apporter. Elle donne le chiffre nouveau, le lien, et deux reponses possibles
// par simple retour d'e-mail — le canal le moins exigeant pour un recruteur.

const SITE = 'https://www.soussmassa-rh.com';

export interface RelanceData {
  nomEntreprise: string;
  nouvelles: number;      // candidatures recues depuis l'invitation
  total: number;          // candidatures au total sur ses offres
  dateInvitation: string; // ISO
}

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function dateFr(iso: string): string {
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
    'septembre', 'octobre', 'novembre', 'décembre'];
  const d = new Date(iso);
  return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${mois[d.getUTCMonth()]}`;
}

export function sujetRelance(d: RelanceData): string {
  const n = d.nouvelles;
  return `${n} nouvelle${n > 1 ? 's' : ''} candidature${n > 1 ? 's' : ''} pour ${d.nomEntreprise}`;
}

export function corpsRelance(d: RelanceData): string {
  const nom = esc(d.nomEntreprise);
  const n = d.nouvelles;
  const p = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151">${html}</p>`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px">
        <tr><td style="padding-bottom:20px">
          <span style="font-size:19px;font-weight:700;color:#1d4ed8">SoussMassa</span><span style="font-size:19px;color:#9ca3af">-RH</span>
        </td></tr>
        <tr><td>
          ${p('Bonjour,')}
          ${p(`Depuis notre message du ${dateFr(d.dateInvitation)}, <strong style="color:#111827">${n} nouvelle${n > 1 ? 's personnes ont' : ' personne a'} postulé</strong>
              aux offres de ${nom} publiées sur SoussMassa-RH, le portail de l'emploi du Souss-Massa.
              Cela fait ${d.total} candidature${d.total > 1 ? 's' : ''} au total, CV compris.`)}
          ${p(`Elles vous attendent dans votre espace recruteur, entièrement gratuit :`)}
        </td></tr>
        <tr><td align="center" style="padding:4px 0 22px">
          <a href="${SITE}/connexion-entreprise"
             style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px">
            Voir les candidatures
          </a>
        </td></tr>
        <tr><td>
          ${p(`Vos identifiants figurent dans notre message du ${dateFr(d.dateInvitation)}. Si vous ne le retrouvez pas,
              <strong style="color:#111827">répondez simplement à cet e-mail</strong> et nous vous renverrons un accès.`)}
          ${p(`Vous préférez recevoir les CV directement par e-mail ? Répondez « oui » : nous les transférerons à cette adresse.`)}
          ${p('Bien cordialement,<br>L’équipe SoussMassa-RH')}
        </td></tr>
        <tr><td style="border-top:1px solid #eef0f3;padding-top:16px">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af">
            Vous recevez ce message parce que des offres à votre nom sont publiées sur SoussMassa-RH.
            Pour ne plus être contacté, répondez « stop » ou écrivez à
            <a href="mailto:contact@soussmassa-rh.com" style="color:#6b7280">contact@soussmassa-rh.com</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
