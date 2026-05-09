// src/pages/api/sync-calendar.ts
// Synchronise les indisponibilités Getaround (locations + blocages propriétaire)
// vers la table indisponibilites de Supabase.
// Utilise GET /cars/{id}/unavailabilities.json qui retourne toutes les périodes
// (reason: "booked" pour les locations clients, autres raisons pour blocages manuels).
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../lib/supabase';
import { getUnavailablePeriods } from '../../lib/getaround';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  const cookies = request.headers.get('cookie') || '';
  const key = url.searchParams.get('key');
  const authorized = cookies.includes('admin_auth=true') || key === adminPassword;
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

    let synced = 0;
    let deleted = 0;
    const errors: string[] = [];
    const detail: Record<string, number> = {};

    for (const vehicule of vehicules) {
      const carId = String(vehicule.getaround_id);

      // Récupère les indisponibilités depuis Getaround
      const periods = await getUnavailablePeriods(carId, startDate, endDate);

      // Supprime les anciennes entrées sync (source=getaround, sans rental_id)
      // Les entrées créées par webhook (avec getaround_rental_id) sont préservées.
      const { count } = await supabase
        .from('indisponibilites')
        .delete({ count: 'exact' })
        .eq('vehicule_id', vehicule.id)
        .eq('source', 'getaround')
        .is('getaround_rental_id', null);

      deleted += count ?? 0;

      // Réinsère les périodes actuelles
      for (const period of periods) {
        const { error } = await supabase.from('indisponibilites').insert({
          vehicule_id: vehicule.id,
          date_debut: period.starts_at,
          date_fin: period.ends_at,
          source: 'getaround',
          note: period.reason ? `Getaround (${period.reason})` : 'Getaround',
        });

        if (error) {
          errors.push(`${vehicule.nom} [${carId}]: ${error.message}`);
        } else {
          synced++;
        }
      }

      detail[vehicule.nom] = periods.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
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
