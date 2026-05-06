// src/pages/api/admin/block-dates.ts
// Permet à l'admin de bloquer ou débloquer manuellement des créneaux.
// Bloque simultanément sur le site (table indisponibilites) ET sur Getaround.
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { blockDates, unblockDates } from '../../../lib/getaround';

function isAdmin(request: Request): boolean {
  const cookies = request.headers.get('cookie') || '';
  return cookies.includes('admin_auth=true');
}

// ─── POST : créer un blocage ──────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps invalide' }), { status: 400 });
  }

  const { vehicule_id, date_debut, date_fin, note } = body;

  if (!vehicule_id || !date_debut || !date_fin) {
    return new Response(
      JSON.stringify({ error: 'vehicule_id, date_debut, date_fin sont requis' }),
      { status: 400 },
    );
  }

  // Récupère le getaround_id de la voiture
  const { data: vehicule } = await supabase
    .from('vehicules')
    .select('getaround_id, nom')
    .eq('id', vehicule_id)
    .single();

  // Bloque sur Getaround si la voiture y est référencée
  let blockedOnGetaround = false;
  if (vehicule?.getaround_id) {
    blockedOnGetaround = await blockDates(String(vehicule.getaround_id), date_debut, date_fin);
  }

  // Insère dans indisponibilites
  const { data: record, error } = await supabase
    .from('indisponibilites')
    .insert({
      vehicule_id,
      date_debut,
      date_fin,
      source: 'manual',
      note: note || 'Blocage manuel admin',
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ success: true, record, getaround_blocked: blockedOnGetaround }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};

// ─── DELETE : supprimer un blocage ────────────────────────────────────────────
export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps invalide' }), { status: 400 });
  }

  const { indisponibilite_id } = body;
  if (!indisponibilite_id) {
    return new Response(JSON.stringify({ error: 'indisponibilite_id requis' }), { status: 400 });
  }

  // Récupère l'entrée pour savoir s'il y a un blocage Getaround à supprimer
  const { data: record } = await supabase
    .from('indisponibilites')
    .select('date_debut, date_fin, vehicule_id, vehicules(getaround_id)')
    .eq('id', indisponibilite_id)
    .single();

  let getaroundUnblocked = false;
  if (record?.date_debut && record?.date_fin && record?.vehicules?.getaround_id) {
    getaroundUnblocked = await unblockDates(
      String(record.vehicules.getaround_id),
      record.date_debut,
      record.date_fin,
    );
  }

  const { error } = await supabase
    .from('indisponibilites')
    .delete()
    .eq('id', indisponibilite_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ success: true, getaround_unblocked: getaroundUnblocked }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};

// ─── GET : lister les blocages ────────────────────────────────────────────────
export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  const vehiculeId = url.searchParams.get('vehicule_id');
  let query = supabase
    .from('indisponibilites')
    .select('*, vehicules(nom, getaround_id)')
    .order('date_debut', { ascending: true });

  if (vehiculeId) query = query.eq('vehicule_id', vehiculeId);

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
