import { supabaseAdmin } from './supabase';

const DEFAULTS: Record<string, string> = {
  prix_km_supplementaire: '0.40',
  prix_litre_carburant:   '1.80',
  forcer_2j_weekend:      'false',
};

export async function getReglage(key: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', key)
      .single();
    return data?.value ?? DEFAULTS[key] ?? '';
  } catch {
    return DEFAULTS[key] ?? '';
  }
}

export async function setReglage(key: string, value: string): Promise<void> {
  await supabaseAdmin
    .from('app_config')
    .upsert({ key, value }, { onConflict: 'key' });
}

export function formatPrixKm(value: string): string {
  return parseFloat(value).toFixed(2).replace('.', ',') + ' €';
}
