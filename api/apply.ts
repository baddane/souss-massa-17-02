import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const RECIPIENT_EMAIL = 'r.baddane@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const { candidateName, candidateEmail, candidatePhone, jobTitle, jobRef, cvBase64, cvFileName } = req.body;

    if (!candidateName || !candidateEmail || !jobTitle) {
      return res.status(400).json({ error: 'Nom, email et poste sont requis' });
    }

    const resend = new Resend(resendKey);

    const attachments = cvBase64 && cvFileName
      ? [{ filename: cvFileName, content: cvBase64 }]
      : [];

    await resend.emails.send({
      from: 'SoussMassa-RH <noreply@soussmassa-rh.com>',
      to: RECIPIENT_EMAIL,
      subject: `Candidature : ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #1d4ed8;">Nouvelle candidature — SoussMassa-RH</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #374151;">Poste</td><td style="padding: 8px;">${jobTitle}</td></tr>
            <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold; color: #374151;">Référence</td><td style="padding: 8px;">${jobRef || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #374151;">Candidat</td><td style="padding: 8px;">${candidateName}</td></tr>
            <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold; color: #374151;">Email</td><td style="padding: 8px;"><a href="mailto:${candidateEmail}">${candidateEmail}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #374151;">Téléphone</td><td style="padding: 8px;">${candidatePhone || 'Non renseigné'}</td></tr>
            <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold; color: #374151;">CV</td><td style="padding: 8px;">${cvFileName ? '📎 En pièce jointe' : 'Non fourni'}</td></tr>
          </table>
          <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">Envoyé depuis SoussMassa-RH</p>
        </div>
      `,
      attachments,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error?.message || 'Erreur envoi email' });
  }
}
