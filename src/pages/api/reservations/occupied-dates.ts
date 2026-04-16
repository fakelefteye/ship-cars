// src/pages/api/reservations/occupied-dates.ts
export const prerender = false;
import { supabase } from '../../../lib/supabase';

export const GET = async ({ url }) => {
  const vehiculeId = url.searchParams.get('id');

  if (!vehiculeId) {
    return new Response(JSON.stringify({ error: "ID manquant" }), { status: 400 });
  }

  // On bloque les dates pour les réservations payées ET en cours de paiement
  // (évite les doubles réservations pendant qu'un client finalise son paiement)
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('date_debut, date_fin')
    .eq('vehicule_id', vehiculeId)
    .in('statut', ['paye', 'confirmee', 'en_attente_paiement']);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // On formate les dates pour Flatpickr
  const formattedDates = reservations.map(res => ({
    from: res.date_debut,
    to: res.date_fin
  }));

  return new Response(JSON.stringify(formattedDates), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};