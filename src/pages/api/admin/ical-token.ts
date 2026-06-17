import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { randomUUID } from 'crypto';

function isAdmin(request: Request): boolean {
  return (request.headers.get('cookie') || '').includes('admin_auth=true');
}

export const POST: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  const newToken = randomUUID();
  const { error } = await supabaseAdmin
    .from('app_config')
    .upsert({ key: 'ical_secret', value: newToken }, { onConflict: 'key' });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ token: newToken }), { status: 200 });
};
