// src/pages/api/reservations/create.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { blockDates } from '../../../lib/getaround';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { vehicule_id, date_debut, date_fin, montant_total, email_client } = body;

    // 1. Récupère l'ID Getaround du véhicule
    const { data: vehicule, error: vehiculeError } = await supabase
      .from('vehicules')
      .select('getaround_id, nom')
      .eq('id', vehicule_id)
      .single();

    if (vehiculeError || !vehicule) {
      return new Response(JSON.stringify({ error: 'Véhicule introuvable dans la base.' }), {
        status: 404,
      });
    }

    // 2. Enregistre la réservation dans Supabase
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        vehicule_id,
        date_debut,
        date_fin,
        montant_total: parseFloat(montant_total) || 0,
        email_client: email_client || null,
        statut: 'confirmee',
      })
      .select()
      .single();

    if (resError) {
      console.error('Erreur insertion Supabase:', resError);
      throw resError;
    }

    // 3. Bloque les dates sur Getaround et stocke l'id de la période
    if (vehicule.getaround_id) {
      try {
        const period = await blockDates(
          String(vehicule.getaround_id),
          date_debut,
          date_fin,
        );

        if (period?.id) {
          // Stocke l'id pour pouvoir débloquer en cas d'annulation
          await supabase
            .from('reservations')
            .update({ getaround_unavailable_period_id: period.id })
            .eq('id', reservation.id);
        } else {
          console.error('[create] Getaround a refusé le blocage pour la voiture', vehicule.getaround_id);
        }
      } catch (apiErr) {
        console.error('[create] Erreur technique Getaround:', apiErr);
      }
    }

    return new Response(JSON.stringify({ success: true, reservation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Erreur critique reservation/create:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
