// src/pages/api/admin/tarifs.ts — CRUD tarifs dynamiques
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAdmin(req: Request) {
  return (req.headers.get('cookie') || '').includes('admin_auth=true');
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });

  const vehiculeId = url.searchParams.get('vehicule_id');
  let q = supabase.from('tarifs_dynamiques').select('*').order('date_debut');
  if (vehiculeId) q = q.eq('vehicule_id', vehiculeId);

  const { data, error } = await q;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return new Response(JSON.stringify({ error: 'Corps invalide' }), { status: 400 });

  const { vehicule_id, date_debut, date_fin, prix_journalier, label, couleur } = body;
  if (!vehicule_id || !date_debut || !date_fin || !prix_journalier) {
    return new Response(JSON.stringify({ error: 'vehicule_id, date_debut, date_fin, prix_journalier requis' }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('tarifs_dynamiques')
    .insert({ vehicule_id, date_debut, date_fin, prix_journalier: parseFloat(prix_journalier), label: label || null, couleur: couleur || '#c9a84c' })
    .select().single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.id) return new Response(JSON.stringify({ error: 'id requis' }), { status: 400 });

  const { error } = await supabase.from('tarifs_dynamiques').delete().eq('id', body.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
