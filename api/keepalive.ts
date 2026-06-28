export const config = { runtime: 'edge' };

// Endpoint "keepalive" appele par Vercel Cron (voir vercel.json > crons).
// Il effectue une requete minimale sur Supabase pour empecher la mise en pause
// du projet gratuit (pause apres ~7 jours sans aucune activite).
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

export default async function handler() {
  const ts = new Date().toISOString();
  try {
    // Requete la plus legere possible : 1 ligne, 1 colonne.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/job_offers?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, ts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err), ts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
