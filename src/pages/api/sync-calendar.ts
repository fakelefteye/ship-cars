// src/pages/api/sync-calendar.ts
// Synchronise les locations Getaround → table indisponibilites de Supabase.
// Appelable manuellement depuis l'admin ou via un cron externe.
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../lib/supabase';
import { getRentals } from '../../lib/getaround';

export const GET: APIRoute = async ({ request }) => {
  // Protection basique par clé ou cookie admin
  const url = new URL(request.url);
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  const cookies = request.headers.get('cookie') || '';
  const key = url.searchParams.get('key');
  const authorized = cookies.includes('admin_auth=true') || key === adminPassword;
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  try {
    // 1. Récupère toutes les voitures avec leur getaround_id
    const { data: vehicules, error: vErr } = await supabase
      .from('vehicules')
      .select('id, nom, getaround_id')
      .not('getaround_id', 'is', null);

    if (vErr || !vehicules?.length) {
      return new Response(
        JSON.stringify({ error: 'Aucun véhicule avec getaround_id trouvé', detail: vErr?.message }),
        { status: 500 },
      );
    }

    const carIdToVehiculeId = Object.fromEntries(
      vehicules.map((v) => [String(v.getaround_id), v.id]),
    );

    // 2. Récupère toutes les locations depuis Getaround
    const rentals = await getRentals();

    let synced = 0;
    let cancelled = 0;
    const errors: string[] = [];

    // 3. Upsert les locations actives dans indisponibilites
    for (const rental of rentals) {
      const vehiculeId = carIdToVehiculeId[String(rental.car_id)];
      if (!vehiculeId) continue; // voiture non gérée sur ce site

      if (rental.state === 'cancelled') {
        // Supprime l'entrée si la location est annulée
        const { error } = await supabase
          .from('indisponibilites')
          .delete()
          .eq('getaround_rental_id', rental.id);
        if (!error) cancelled++;
        continue;
      }

      const { error } = await supabase.from('indisponibilites').upsert(
        {
          vehicule_id: vehiculeId,
          date_debut: rental.start_at,
          date_fin: rental.end_at,
          source: 'getaround',
          getaround_rental_id: rental.id,
          note: `Location Getaround #${rental.id}`,
        },
        { onConflict: 'getaround_rental_id' },
      );

      if (error) {
        errors.push(`rental ${rental.id}: ${error.message}`);
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        cancelled,
        errors: errors.length ? errors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[sync-calendar]', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
