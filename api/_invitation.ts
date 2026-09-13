// Message d'invitation envoye a une entreprise deja presente sur la plateforme.
//
// ANGLE ASSUME : le message s'ouvre sur un fait verifiable et propre a
// l'entreprise — « 16 personnes ont postule a vos offres » — et non sur la
// presentation du service. Un e-mail non sollicite qui commence par un
// identifiant et un mot de passe ressemble a du hameconnage : il serait
// signale, et un domaine signale fait retomber en spam TOUS les envois
// legitimes, alertes candidats comprises.
//
// Les identifiants viennent donc en second, comme le moyen d'acceder a ce qui
// attend deja l'entreprise.

const SITE = 'https://www.soussmassa-rh.com';

export interface InvitationData {
  nomEntreprise: string;
  ville?: string | null;
  email: string;
  motDePasse: string;
  candidatures: number;
  offres: number;
  /** Profils consultables dans la CVtheque, a la date de l'envoi. */
  profilsCvtheque?: number;
}

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Objet du message : le chiffre d'abord, il doit survivre a la troncature. */
export function sujetInvitation(d: InvitationData): string {
  if (d.candidatures > 0) {
    return d.candidatures === 1
      ? `1 candidature vous attend — ${d.nomEntreprise}`
      : `${d.candidatures} candidatures vous attendent — ${d.nomEntreprise}`;
  }
  return `${d.nomEntreprise} : vos offres sur SoussMassa-RH`;
}

export function corpsInvitation(d: InvitationData): string {
  const nom = esc(d.nomEntreprise);
  const lieu = d.ville ? ` à ${esc(d.ville)}` : '';

  // Sans candidature, promettre des candidatures serait faux. On parle alors
  // des offres en ligne et de la CVtheque, qui sont vrais eux aussi.
  const accroche = d.candidatures > 0
    ? `<p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:#111827">
         <strong>${d.candidatures} personne${d.candidatures > 1 ? 's ont' : ' a'} postulé</strong>
         à vos offres publiées sur SoussMassa-RH${lieu}.
         ${d.candidatures > 1 ? 'Leurs CV vous attendent' : 'Son CV vous attend'} dans votre espace recruteur.
       </p>`
    : `<p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:#111827">
         Vos <strong>${d.offres} offre${d.offres > 1 ? 's' : ''}</strong> publiée${d.offres > 1 ? 's' : ''}
         sur SoussMassa-RH${lieu} ${d.offres > 1 ? 'sont' : 'est'} en ligne.
         Un espace recruteur vous est ouvert pour les gérer et recevoir les candidatures.
       </p>`;

  const cvtheque = d.profilsCvtheque
    ? `<li style="margin-bottom:6px">Consulter la CVthèque régionale (${d.profilsCvtheque} profils)</li>`
    : '';

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
          <p style="margin:0 0 4px;font-size:15px;color:#374151">Bonjour,</p>
          ${accroche}
        </td></tr>

        <tr><td style="padding:4px 0 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px">
            <tr><td style="padding:16px 18px">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">
                Vos accès — ${nom}
              </p>
              <p style="margin:0 0 4px;font-size:14px;color:#374151">
                Identifiant : <strong style="color:#111827">${esc(d.email)}</strong>
              </p>
              <p style="margin:0;font-size:14px;color:#374151">
                Mot de passe : <strong style="font-family:ui-monospace,Menlo,Consolas,monospace;color:#111827">${esc(d.motDePasse)}</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding-bottom:22px">
          <a href="${SITE}/connexion-entreprise"
             style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px">
            ${d.candidatures > 0 ? 'Voir les candidatures' : 'Accéder à mon espace'}
          </a>
        </td></tr>

        <tr><td>
          <p style="margin:0 0 8px;font-size:14px;color:#374151">Depuis votre espace, vous pouvez :</p>
          <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;color:#374151">
            <li style="margin-bottom:6px">Lire les candidatures reçues et télécharger les CV</li>
            <li style="margin-bottom:6px">Publier, modifier ou retirer vos offres</li>
            ${cvtheque}
          </ul>
          <p style="margin:0 0 18px;font-size:14px;color:#374151">
            <strong>Le service est gratuit</strong>, sans engagement. Nous vous conseillons de changer
            votre mot de passe à la première connexion (onglet « Mon compte »).
          </p>
        </td></tr>

        <tr><td style="border-top:1px solid #eef0f3;padding-top:16px">
          <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#9ca3af">
            Vous recevez ce message parce que des offres d'emploi à votre nom sont publiées sur
            SoussMassa-RH, le portail de l'emploi de la région Souss-Massa, et que des candidats y
            ont répondu.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af">
            Vous ne souhaitez plus être contacté, ou ces offres ne sont pas les vôtres ?
            Répondez à ce message ou écrivez à
            <a href="mailto:contact@soussmassa-rh.com" style="color:#6b7280">contact@soussmassa-rh.com</a>,
            nous fermerons le compte.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}
