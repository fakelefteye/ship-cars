export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  if (!(request.headers.get('cookie') || '').includes('admin_auth=true'))
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  const { data } = await supabaseAdmin.from('app_config').select('value').eq('key', 'derniere_minute_actif').single();
  return new Response(JSON.stringify({ actif: data?.value === 'true' }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(request.headers.get('cookie') || '').includes('admin_auth=true'))
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  const { actif } = await request.json();
  await supabaseAdmin.from('app_config').upsert({
    key: 'derniere_minute_actif',
    value: actif ? 'true' : 'false',
    updated_at: new Date().toISOString(),
  });
  return new Response(JSON.stringify({ success: true, actif }), { headers: { 'Content-Type': 'application/json' } });
};
