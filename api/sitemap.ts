import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';
const SITE_URL = process.env.SITE_URL || 'https://soussmassa-rh.com';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/job_offers?select=slug,date_offre&order=date_offre.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const offers = response.ok ? await response.json() : [];
    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/offres', priority: '0.9', changefreq: 'daily' },
      { url: '/contact', priority: '0.5', changefreq: 'monthly' },
    ];

    const urls = staticPages
      .map(p => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`)
      .concat(
        (offers || []).map((o: any) => `  <url>
    <loc>${SITE_URL}/emploi/${o.slug}</loc>
    <lastmod>${o.date_offre || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
      )
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err) {
    res.setHeader('Content-Type', 'application/xml');
    const today = new Date().toISOString().split('T')[0];
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/offres</loc>
    <lastmod>${today}</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>`;
    return res.status(200).send(fallback);
  }
}
