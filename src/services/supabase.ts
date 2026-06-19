import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder';

const offersSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_OFFERS_URL || '';
const offersSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_OFFERS_ANON_KEY || '';

const siteSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const siteSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

function safeCreateClient(url: string, key: string): SupabaseClient {
  if (!url || !key) {
    console.warn('Supabase env vars missing — using placeholder client (API calls will fail gracefully)');
    return createClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }
  return createClient(url, key);
}

export const supabaseOffers = safeCreateClient(offersSupabaseUrl, offersSupabaseAnonKey);
export const supabaseSite = safeCreateClient(siteSupabaseUrl, siteSupabaseAnonKey);

export const supabase = supabaseSite;
export const supabaseUrl = siteSupabaseUrl;
