export const config = { runtime: 'edge' };

export default function handler() {
  const txt = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://soussmassa-rh.com/sitemap.xml`;

  return new Response(txt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400',
    },
  });
}
