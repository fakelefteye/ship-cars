import { supabaseAdmin } from './supabase';

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('app_config').select('value').eq('key', 'maintenance_mode').single();
    return data?.value === 'true';
  } catch { return false; }
}
