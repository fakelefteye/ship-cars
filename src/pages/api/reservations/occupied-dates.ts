// src/pages/api/reservations/occupied-dates.ts
// Retourne les créneaux occupés pour un véhicule donné.
// Fusionne : réservations actives (Supabase) + indisponibilites (Getaround + manuel).
export const prerender = false;

import { supabaseAdmin as supabase } from '../../../lib/supabase';

export const GET = async ({ url }: { url: URL }) => {
  const vehiculeId = url.searchParams.get('id');

  if (!vehiculeId) {
    return new Response(JSON.stringify({ error: 'ID manquant' }), { status: 400 });
  }

  // 1. Réservations payées / confirmées / en attente de paiement
  const { data: reservations, error: resErr } = await supabase
    .from('reservations')
    .select('date_debut, date_fin')
    .eq('vehicule_id', vehiculeId)
    .in('statut', ['paye', 'confirmee', 'en_attente_paiement']);

  if (resErr) {
    return new Response(JSON.stringify({ error: resErr.message }), { status: 500 });
  }

  // 2. Indisponibilités (Getaround + blocages manuels admin)
  const { data: indisponibilites, error: indErr } = await supabase
    .from('indisponibilites')
    .select('date_debut, date_fin')
    .eq('vehicule_id', vehiculeId);

  if (indErr) {
    return new Response(JSON.stringify({ error: indErr.message }), { status: 500 });
  }

  // 3. Fusion des deux sources
  const occupied = [
    ...(reservations ?? []).map((r) => ({ from: r.date_debut, to: r.date_fin })),
    ...(indisponibilites ?? []).map((i) => ({ from: i.date_debut, to: i.date_fin })),
  ];

  return new Response(JSON.stringify(occupied), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
