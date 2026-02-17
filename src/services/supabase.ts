import { createClient } from '@supabase/supabase-js';

// Configuration pour la base de données d'offres d'emploi externe
const offersSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_OFFERS_URL || '';
const offersSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_OFFERS_ANON_KEY || '';

// Configuration pour la base de données du site actuel (authentification et données utilisateur)
const siteSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const siteSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Vérification que les variables d'environnement sont définies
if (!offersSupabaseUrl || !offersSupabaseAnonKey) {
  console.error('Variables d\'environnement des offres non définies. Configurez VITE_SUPABASE_OFFERS_URL et VITE_SUPABASE_OFFERS_ANON_KEY dans .env.local');
}

if (!siteSupabaseUrl || !siteSupabaseAnonKey) {
  console.error('Variables d\'environnement du site non définies. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local');
}

// Clients Supabase (always initialized - will fail at runtime if env vars missing)
export const supabaseOffers = createClient(offersSupabaseUrl, offersSupabaseAnonKey);
export const supabaseSite = createClient(siteSupabaseUrl, siteSupabaseAnonKey);

// Export par défaut - UTILISER TOUJOURS supabaseSite pour l'authentification et les données utilisateur
// supabaseOffers est uniquement pour les offres d'emploi
export const supabase = supabaseSite;

// URL du client Supabase pour les fonctions Edge
export const supabaseUrl = siteSupabaseUrl;
