export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  if (!(request.headers.get('cookie') || '').includes('admin_auth=true'))
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  const { data } = await supabaseAdmin.from('app_config').select('value').eq('key', 'maintenance_mode').single();
  return new Response(JSON.stringify({ maintenance: data?.value === 'true' }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(request.headers.get('cookie') || '').includes('admin_auth=true'))
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  const { maintenance } = await request.json();
  await supabaseAdmin.from('app_config').upsert({ key: 'maintenance_mode', value: maintenance ? 'true' : 'false', updated_at: new Date().toISOString() });
  return new Response(JSON.stringify({ success: true, maintenance }), { headers: { 'Content-Type': 'application/json' } });
};
