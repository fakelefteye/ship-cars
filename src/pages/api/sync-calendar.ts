// src/pages/api/sync-calendar.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { fetchGetaroundRentals } from '../../lib/getaround-api';

export const GET: APIRoute = async () => {
  const getaroundData = await fetchGetaroundRentals();
  
  if (!getaroundData) {
    return new Response(JSON.stringify({ error: "Echec API Getaround" }), { status: 500 });
  }

  // Exemple simplifié de logique d'insertion
  // Attention: Il faut d'abord adapter les ID véhicules Getaround avec vos ID Supabase
  for (const rental of getaroundData.rentals) {
    await supabase.from('indisponibilites').upsert({
      source: 'getaround',
      date_debut: rental.start_at,
      date_fin: rental.end_at,
      // vehicule_id: ... à mapper selon vos voitures
    });
  }

  return new Response(JSON.stringify({ success: true, message: "Calendrier synchronisé" }), { status: 200 });
};