export const config = { runtime: 'edge' };

export default function handler() {
  const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: Bingbot
Allow: /
Disallow: /admin
Disallow: /api/
Crawl-delay: 2

Sitemap: https://soussmassa-rh.com/sitemap.xml`;

  return new Response(txt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400',
    },
  });
}
