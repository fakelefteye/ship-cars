export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const debut = url.searchParams.get('debut');
  const fin   = url.searchParams.get('fin');

  if (!debut || !fin) {
    return new Response(JSON.stringify({ error: 'Paramètres debut et fin requis' }), { status: 400 });
  }

  const [{ data: vehicules }, { data: conflicts }] = await Promise.all([
    supabase.from('vehicules').select('id').eq('disponible_resa', true),
    supabase
      .from('indisponibilites')
      .select('vehicule_id')
      .lt('date_debut', fin)
      .gt('date_fin', debut),
  ]);

  const unavailableIds = new Set((conflicts ?? []).map(c => c.vehicule_id));
  const available   = (vehicules ?? []).filter(v => !unavailableIds.has(v.id)).map(v => v.id);
  const unavailable = (vehicules ?? []).filter(v =>  unavailableIds.has(v.id)).map(v => v.id);

  return new Response(JSON.stringify({ available, unavailable }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
