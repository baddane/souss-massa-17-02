// Gabarit HTML commun des e-mails SoussMassa-RH (memes logo, carte et
// couleurs que `_invitation.ts` et `_relance.ts`), pour les messages libres
// de la file « Messages préparés ». Le texte est echappe : un message prepare
// ne peut pas injecter de HTML.

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Texte brut -> paragraphes. Les URL https deviennent des liens. */
function paragraphes(texte: string): string {
  return String(texte || '').trim().split(/\n\s*\n/).map((bloc) => {
    const html = esc(bloc).replace(/\n/g, '<br>')
      .replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1d4ed8">$1</a>');
    return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151">${html}</p>`;
  }).join('\n');
}

export function corpsMessage(texte: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px">
        <tr><td style="padding-bottom:20px">
          <span style="font-size:19px;font-weight:700;color:#1d4ed8">SoussMassa</span><span style="font-size:19px;color:#9ca3af">-RH</span>
        </td></tr>
        <tr><td>${paragraphes(texte)}</td></tr>
        <tr><td style="border-top:1px solid #eef0f3;padding-top:16px">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af">
            SoussMassa-RH, le portail de l'emploi de la région Souss-Massa —
            <a href="https://www.soussmassa-rh.com" style="color:#6b7280">www.soussmassa-rh.com</a>.
            Pour ne plus être contacté, répondez « stop ».
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Version texte de secours. */
export function texteMessage(texte: string): string {
  return `${String(texte || '').trim()}\n\n--\nSoussMassa-RH — https://www.soussmassa-rh.com\nPour ne plus être contacté, répondez « stop ».`;
}
