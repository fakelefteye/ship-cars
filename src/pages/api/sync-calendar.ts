// src/pages/api/sync-calendar.ts
// Synchronise les indisponibilités Getaround (locations + blocages propriétaire)
// vers la table indisponibilites de Supabase.
// Utilise GET /cars/{id}/unavailabilities.json qui retourne toutes les périodes
// (reason: "booked" pour les locations clients, autres raisons pour blocages manuels).
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../lib/supabase';
import { getUnavailablePeriods, getRentals, getRental } from '../../lib/getaround';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  const cronSecret   = import.meta.env.CRON_SECRET;
  const cookies = request.headers.get('cookie') || '';
  const key = url.searchParams.get('key');
  const authHeader = request.headers.get('authorization') || '';
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const authorized = cookies.includes('admin_auth=true') || key === adminPassword || isCron;
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  try {
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

    // Fenêtre de sync : aujourd'hui → +30 jours (limite max de l'API Getaround)
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startDate = now.toISOString();
    const endDate = in30Days.toISOString();

    let syncedUnavail = 0;
    let syncedRentals = 0;
    let deleted = 0;
    const errors: string[] = [];
    const detail: Record<string, { unavailabilities: number; rentals: number }> = {};

    // ── 1. Indisponibilités manuelles (blocs propriétaire) ──────────────────
    for (const vehicule of vehicules) {
      const carId = String(vehicule.getaround_id);
      const periods = await getUnavailablePeriods(carId, startDate, endDate);

      // Supprime les anciennes entrées manuelles syncées (sans rental_id)
      const { count } = await supabase
        .from('indisponibilites')
        .delete({ count: 'exact' })
        .eq('vehicule_id', vehicule.id)
        .eq('source', 'getaround')
        .is('getaround_rental_id', null);
      deleted += count ?? 0;

      for (const period of periods) {
        const { error } = await supabase.from('indisponibilites').insert({
          vehicule_id: vehicule.id,
          date_debut:  period.starts_at,
          date_fin:    period.ends_at,
          source:      'getaround',
          note:        period.reason ? `Getaround bloc (${period.reason})` : 'Getaround bloc',
        });
        if (error) errors.push(`${vehicule.nom} unavail: ${error.message}`);
        else syncedUnavail++;
      }

      detail[vehicule.nom] = { unavailabilities: periods.length, rentals: 0 };
    }

    // ── 2. Réservations clients (rental.booked) ─────────────────────────────
    // Fenêtre : 7 jours en arrière → +23 jours (limite 30j de l'API)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const in23Days     = new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000);

    const rentalIds = await getRentals(sevenDaysAgo.toISOString(), in23Days.toISOString());

    for (const { id: rentalId } of rentalIds) {
      const rental = await getRental(rentalId);
      if (!rental) continue;

      const vehicule = vehicules.find(v => String(v.getaround_id) === String(rental.car_id));
      if (!vehicule) continue;

      // Ignore les annulations
      const state = (rental as any).state ?? '';
      if (state === 'cancelled' || state === 'canceled') continue;

      const { error } = await supabase.from('indisponibilites').upsert(
        {
          vehicule_id:         vehicule.id,
          date_debut:          rental.starts_at,
          date_fin:            rental.ends_at,
          source:              'getaround',
          getaround_rental_id: String(rental.id),
          note:                `Location Getaround #${rental.id}`,
        },
        { onConflict: 'getaround_rental_id' },
      );
      if (error) errors.push(`Rental #${rentalId}: ${error.message}`);
      else {
        syncedRentals++;
        if (detail[vehicule.nom]) detail[vehicule.nom].rentals++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced_unavailabilities: syncedUnavail,
        synced_rentals: syncedRentals,
        deleted,
        detail,
        errors: errors.length ? errors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[sync-calendar]', err);
    return new Response(JSON.stringify({
      error: err.message,
      cause: err.cause?.message,
      code: err.cause?.code,
    }), { status: 500 });
  }
};
