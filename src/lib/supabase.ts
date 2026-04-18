import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL manquant dans .env');
if (!supabaseAnonKey) throw new Error('SUPABASE_ANON_KEY manquant dans .env');

// Client public (lectures côté client)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin (opérations serveur : insert, upload — bypass RLS).
// Fallback sur la clé anonyme si la service_role n'est pas configurée, avec avertissement.
if (!supabaseServiceKey) {
  console.warn(
    '[supabase] SUPABASE_SERVICE_KEY manquant — fallback sur la clé anonyme. ' +
    'Les opérations admin risquent d\'échouer à cause des RLS. ' +
    'Ajoute la clé service_role depuis Supabase → Project Settings → API.'
  );
}
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);