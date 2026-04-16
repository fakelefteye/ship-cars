import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

// Client public (lectures côté client)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin (opérations serveur : insert, upload — bypass RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);