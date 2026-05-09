// src/pages/api/admin/webhook-events.ts
// Retourne les 50 derniers événements webhook Getaround reçus (admin only)
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAdmin(request: Request): boolean {
  const cookies = request.headers.get('cookie') ?? '';
  if (cookies.includes('admin_auth=true')) return true;
  const url = new URL(request.url);
  return url.searchParams.get('key') === import.meta.env.ADMIN_PASSWORD;
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  const { data, error } = await supabase
    .from('webhook_events')
    .select('id, received_at, event_type, result, error, payload')
    .order('received_at', { ascending: false })
    .limit(50);

  if (error) {
    // La table n'existe peut-être pas encore
    return new Response(JSON.stringify({ error: error.message, hint: 'Avez-vous appliqué supabase/webhook-events.sql ?' }), { status: 500 });
  }

  return new Response(JSON.stringify({ events: data ?? [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
