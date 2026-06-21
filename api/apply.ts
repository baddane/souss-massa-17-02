import type { IncomingMessage, ServerResponse } from 'http';
import nodemailer from 'nodemailer';

const RECIPIENT_EMAIL = 'r.baddane@gmail.com';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const gmailUser = process.env.GMAIL_USER || RECIPIENT_EMAIL;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailAppPassword) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Email service not configured' }));
    return;
  }

  try {
    const { candidateName, candidateEmail, candidatePhone, jobTitle, jobRef, cvBase64, cvFileName } = await parseBody(req);

    if (!candidateName || !candidateEmail || !jobTitle) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Nom, email et poste sont requis' }));
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    const attachments = cvBase64 && cvFileName
      ? [{ filename: cvFileName, content: cvBase64, encoding: 'base64' as const }]
      : [];

    await transporter.sendMail({
      from: `SoussMassa-RH <${gmailUser}>`,
      to: RECIPIENT_EMAIL,
      replyTo: candidateEmail,
      subject: `Candidature : ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #1d4ed8;">Nouvelle candidature — SoussMassa-RH</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">Poste</td><td style="padding: 8px;">${jobTitle}</td></tr>
            <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold;">Référence</td><td style="padding: 8px;">${jobRef || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Candidat</td><td style="padding: 8px;">${candidateName}</td></tr>
            <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold;">Email</td><td style="padding: 8px;"><a href="mailto:${candidateEmail}">${candidateEmail}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Téléphone</td><td style="padding: 8px;">${candidatePhone || 'Non renseigné'}</td></tr>
            <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold;">CV</td><td style="padding: 8px;">${cvFileName ? 'En pièce jointe' : 'Non fourni'}</td></tr>
          </table>
        </div>
      `,
      attachments,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error('Email send error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error?.message || 'Erreur envoi email' }));
  }
}
