// src/pages/api/admin/regles.ts — Règles de location par véhicule
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAdmin(req: Request) {
  return (req.headers.get('cookie') || '').includes('admin_auth=true');
}

export const GET: APIRoute = async ({ request, url }) => {
  const vehiculeId = url.searchParams.get('vehicule_id');
  if (!vehiculeId) return new Response(JSON.stringify({ error: 'vehicule_id requis' }), { status: 400 });

  const { data, error } = await supabase
    .from('regles_location')
    .select('*')
    .eq('vehicule_id', vehiculeId)
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Valeurs par défaut si aucune règle n'existe
  const defaults = {
    vehicule_id: vehiculeId,
    duree_min_heures: 24,
    duree_max_jours: null,
    delai_reservation_heures: 0,
    plage_disponibilite_jours: 90,
  };

  return new Response(JSON.stringify(data ?? defaults), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.vehicule_id) return new Response(JSON.stringify({ error: 'vehicule_id requis' }), { status: 400 });

  const { vehicule_id, duree_min_heures, duree_max_jours, delai_reservation_heures, plage_disponibilite_jours } = body;

  const { data, error } = await supabase
    .from('regles_location')
    .upsert(
      {
        vehicule_id,
        duree_min_heures:          parseInt(duree_min_heures)          || 24,
        duree_max_jours:           duree_max_jours ? parseInt(duree_max_jours) : null,
        delai_reservation_heures:  parseInt(delai_reservation_heures)  || 0,
        plage_disponibilite_jours: parseInt(plage_disponibilite_jours) || 90,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vehicule_id' },
    )
    .select().single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
