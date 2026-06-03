// src/pages/api/admin/regles-periodes.ts — Règles de durée par période
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAdmin(req: Request) {
  return (req.headers.get('cookie') || '').includes('admin_auth=true');
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });
  const vehiculeId = url.searchParams.get('vehicule_id');
  if (!vehiculeId) return new Response(JSON.stringify({ error: 'vehicule_id requis' }), { status: 400 });

  const { data, error } = await supabase
    .from('regles_periodes')
    .select('*')
    .eq('vehicule_id', vehiculeId)
    .order('date_debut');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data ?? []), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.vehicule_id || !body.date_debut || !body.date_fin) {
    return new Response(JSON.stringify({ error: 'vehicule_id, date_debut, date_fin requis' }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('regles_periodes')
    .insert({
      vehicule_id:    body.vehicule_id,
      date_debut:     body.date_debut,
      date_fin:       body.date_fin,
      duree_min_jours: body.duree_min_jours ? parseInt(body.duree_min_jours) : 1,
      duree_max_jours: body.duree_max_jours ? parseInt(body.duree_max_jours) : null,
      label:          body.label || null,
    })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.id) return new Response(JSON.stringify({ error: 'id requis' }), { status: 400 });

  const { error } = await supabase.from('regles_periodes').delete().eq('id', body.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
