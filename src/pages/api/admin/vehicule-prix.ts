// src/pages/api/admin/vehicule-prix.ts — Sauvegarde les 3 prix de saison d'un véhicule
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAdmin(req: Request) {
  return (req.headers.get('cookie') || '').includes('admin_auth=true');
}

export const PUT: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.vehicule_id) {
    return new Response(JSON.stringify({ error: 'vehicule_id requis' }), { status: 400 });
  }

  const { vehicule_id, prix_basse, prix_moyenne, prix_haute } = body;

  const update: Record<string, number | null> = {};
  if (prix_basse  !== undefined) update.prix_basse  = prix_basse  ? Number(prix_basse)  : null;
  if (prix_moyenne !== undefined) update.prix_moyenne = prix_moyenne ? Number(prix_moyenne) : null;
  if (prix_haute  !== undefined) update.prix_haute  = prix_haute  ? Number(prix_haute)  : null;

  const { error } = await supabase.from('vehicules').update(update).eq('id', vehicule_id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
