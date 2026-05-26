// src/pages/api/reservations/cancel.ts
// Annule une réservation du site ET supprime le blocage correspondant sur Getaround.
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { unblockDates } from '../../../lib/getaround';

export const POST: APIRoute = async ({ request }) => {
  // Vérification admin via cookie
  const cookies = request.headers.get('cookie') || '';
  if (!cookies.includes('admin_auth=true')) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  let reservationId: string;
  try {
    const body = await request.json();
    reservationId = body.reservation_id;
  } catch {
    return new Response(JSON.stringify({ error: 'Corps invalide' }), { status: 400 });
  }

  if (!reservationId) {
    return new Response(JSON.stringify({ error: 'reservation_id requis' }), { status: 400 });
  }

  // 1. Récupère la réservation avec le vehicule pour avoir le getaround_id
  const { data: reservation, error: fetchErr } = await supabase
    .from('reservations')
    .select('*, vehicules(getaround_id)')
    .eq('id', reservationId)
    .single();

  if (fetchErr || !reservation) {
    return new Response(JSON.stringify({ error: 'Réservation introuvable' }), { status: 404 });
  }

  // 2. Marque comme annulée dans Supabase
  const { error: updateErr } = await supabase
    .from('reservations')
    .update({ statut: 'annulee' })
    .eq('id', reservationId);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
  }

  // 3. Supprime le blocage sur Getaround via la plage de dates de la réservation
  const carId = reservation.vehicules?.getaround_id;
  let getaroundUnblocked = false;

  if (carId && reservation.date_debut && reservation.date_fin) {
    getaroundUnblocked = await unblockDates(
      String(carId),
      reservation.date_debut,
      reservation.date_fin,
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      reservation_id: reservationId,
      getaround_unblocked: getaroundUnblocked,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
