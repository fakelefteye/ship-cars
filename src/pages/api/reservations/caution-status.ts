export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const reservationId = url.searchParams.get('reservation_id');

  if (!reservationId) {
    return new Response(JSON.stringify({ error: 'reservation_id manquant' }), { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('caution_statut, stripe_caution_id')
    .eq('id', reservationId)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Réservation introuvable' }), { status: 404 });
  }

  return new Response(JSON.stringify({
    caution_statut: data.caution_statut,
    has_caution: !!data.stripe_caution_id,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
