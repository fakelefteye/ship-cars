// src/pages/api/reservations/siege-availability.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  try {
    const startStr = url.searchParams.get('start');
    const endStr = url.searchParams.get('end');

    if (!startStr || !endStr) {
      return new Response(
        JSON.stringify({ error: 'Paramètres start et end requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    // Récupère les sièges auto configurés par l'admin (tous types confondus)
    const { data: options, error: optErr } = await supabaseAdmin
      .from('options_location')
      .select('*')
      .or('nom.ilike.%siège%,nom.ilike.%siege%');

    if (optErr) throw optErr;

    if (!options || options.length === 0) {
      return new Response(JSON.stringify({
        configured: false,
        available: false,
        stock: 0,
        remaining: 0,
        prix: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const totalStock = options.reduce((sum, o) => sum + (o.stock_total || 0), 0);
    const prix = Number(options[0].prix_fixe) || 0;
    const nom = options[0].nom;

    // Compte les réservations avec siège auto qui chevauchent ce créneau
    const { count, error: countErr } = await supabaseAdmin
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('siege_auto', true)
      .in('statut', ['paye', 'confirmee', 'en_attente_paiement'])
      .lt('date_debut', end.toISOString())
      .gt('date_fin', start.toISOString());

    if (countErr) throw countErr;

    const used = count || 0;
    const remaining = Math.max(0, totalStock - used);

    return new Response(JSON.stringify({
      configured: true,
      available: remaining > 0,
      stock: totalStock,
      used,
      remaining,
      prix,
      nom,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Erreur siege-availability:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
