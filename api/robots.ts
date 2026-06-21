import type { IncomingMessage, ServerResponse } from 'http';

const SITE_URL = process.env.SITE_URL || 'https://soussmassa-rh.com';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const txt = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  res.statusCode = 200;
  res.end(txt);
}
