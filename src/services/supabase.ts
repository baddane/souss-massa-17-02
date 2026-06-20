import { createClient } from '@supabase/supabase-js';

const OFFERS_URL = (import.meta as any).env.VITE_SUPABASE_OFFERS_URL || 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const OFFERS_KEY = (import.meta as any).env.VITE_SUPABASE_OFFERS_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM';

export const supabaseOffers = createClient(OFFERS_URL, OFFERS_KEY);
export const supabaseSite = supabaseOffers;

export const supabase = supabaseSite;
export const supabaseUrl = OFFERS_URL;
