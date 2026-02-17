import { createClient } from '@supabase/supabase-js';

// Configuration pour la base de données d'offres d'emploi externe
const offersSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_OFFERS_URL || 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const offersSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_OFFERS_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

// Configuration pour la base de données du site actuel (authentification et données utilisateur)
const siteSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://dbisyinrrwlbvnnvsycy.supabase.co';
const siteSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaXN5aW5ycndsYnZubnZzeWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTA4ODEsImV4cCI6MjA4NjU2Njg4MX0.1E1HEoENIiswqIO8ZUOK33XXbD29rQ-BhU-dqvFReRA';

// Vérification que les variables d'environnement du site sont définies
if (!siteSupabaseUrl || !siteSupabaseAnonKey) {
  console.warn('⚠️  Variables d\'environnement du site non définies. Assurez-vous d\'avoir un .env.local avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
}

// Clients Supabase
export const supabaseOffers = createClient(offersSupabaseUrl, offersSupabaseAnonKey);
export const supabaseSite = siteSupabaseUrl && siteSupabaseAnonKey 
  ? createClient(siteSupabaseUrl, siteSupabaseAnonKey)
  : null;

// Export par défaut - UTILISER TOUJOURS supabaseSite pour l'authentification et les données utilisateur
// supabaseOffers est uniquement pour les offres d'emploi
export const supabase = supabaseSite;

// URL du client Supabase pour les fonctions Edge
export const supabaseUrl = siteSupabaseUrl;

// Fonction utilitaire pour vérifier la configuration
export const checkSupabaseConfig = () => {
  console.log('📋 Configuration Supabase :');
  console.log('🔗 Offers DB URL:', offersSupabaseUrl);
  console.log('🔗 Site DB URL:', siteSupabaseUrl || 'Non configuré');
  console.log('🔑 Offers Key:', offersSupabaseAnonKey ? 'Configurée' : 'Non configurée');
  console.log('🔑 Site Key:', siteSupabaseAnonKey ? 'Configurée' : 'Non configurée');
  
  if (!siteSupabaseUrl || !siteSupabaseAnonKey) {
    console.warn('⚠️  Base de données du site non configurée - certaines fonctionnalités peuvent être limitées');
  }
};
