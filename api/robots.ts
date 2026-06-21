import type { VercelRequest, VercelResponse } from '@vercel/node';

const SITE_URL = process.env.SITE_URL || 'https://soussmassa-rh.com';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const txt = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  return res.status(200).send(txt);
}
