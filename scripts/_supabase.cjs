// Configuration Supabase partagee par les scripts d'import.
// (Le prefixe « _ » signale un module interne, pas un script executable.)
//
// Bascule progressive vers `service_role` :
//   - si la variable d'environnement SUPABASE_SERVICE_ROLE_KEY est definie,
//     les scripts l'utilisent (elle contourne la RLS) ;
//   - sinon ils retombent sur la cle anon, comme avant.
//
// Ce repli permet d'ajouter le secret et de tester sans rien casser. Une fois
// le secret en place partout (local + GitHub Actions), les policies d'ecriture
// anon de `job_offers` pourront etre supprimees : voir la migration
// `supabase/migrations/017_job_offers_lock_writes.sql`, volontairement NON
// appliquee tant que la bascule n'est pas confirmee.
//
// La cle service_role ne doit JAMAIS etre ecrite dans le depot : uniquement en
// variable d'environnement (GitHub → Settings → Secrets, ou export local).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqrhxhoqqktnhttzmoqt.supabase.co';

// Cle publique (anon) : sans danger dans le depot, elle est deja exposee au navigateur.
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const USING_SERVICE_ROLE = SERVICE_ROLE_KEY.length > 0;
const SUPABASE_KEY = USING_SERVICE_ROLE ? SERVICE_ROLE_KEY : ANON_KEY;

/** En-tetes REST Supabase. `extra` permet d'ajouter Content-Type / Prefer. */
function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    ...extra,
  };
}

/** Trace le mode d'authentification sans jamais afficher la cle. */
function logKeyMode(scriptName) {
  if (USING_SERVICE_ROLE) {
    console.log(`[${scriptName}] cle service_role detectee (ecritures autorisees meme apres verrouillage RLS)`);
  } else {
    console.log(`[${scriptName}] cle anon (repli). Definir SUPABASE_SERVICE_ROLE_KEY pour passer en service_role.`);
  }
}

module.exports = { SUPABASE_URL, SUPABASE_KEY, USING_SERVICE_ROLE, headers, logKeyMode };
