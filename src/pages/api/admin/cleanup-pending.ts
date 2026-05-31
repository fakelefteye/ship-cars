export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  // Accepte cookie admin OU header Authorization (pour le cron Vercel)
  const cookie = request.headers.get('cookie') || '';
  const auth   = request.headers.get('authorization') || '';
  const cronSecret = import.meta.env.CRON_SECRET ?? '';

  const isAdmin = cookie.includes('admin_auth=true');
  const isCron  = cronSecret && auth === `Bearer ${cronSecret}`;

  if (!isAdmin && !isCron) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('cleanup_pending_reservations');
    if (error) throw error;

    const nb = Number(data ?? 0);
    return new Response(
      JSON.stringify({ success: true, annulees: nb }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur inconnue' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
