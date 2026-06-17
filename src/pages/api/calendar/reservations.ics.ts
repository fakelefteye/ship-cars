import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { buildCalendar, buildVEvent } from '../../../lib/ical';

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token') ?? '';

  if (!token) {
    return new Response('Token requis', { status: 400 });
  }

  const { data: cfg } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'ical_secret')
    .single();

  if (!cfg?.value || cfg.value !== token) {
    return new Response('Non autorisé', { status: 401 });
  }

  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id, date_debut, date_fin, locataire_nom, email_client, montant_total, vehicules(nom, immatriculation)')
    .in('statut', ['paye', 'confirmee'])
    .order('date_debut', { ascending: false });

  const now = new Date();

  const events = (reservations ?? []).map(r => {
    const veh = (r as any).vehicules;
    const vehicleName = veh?.immatriculation
      ? `${veh.immatriculation} — ${veh.nom ?? ''}`
      : (veh?.nom ?? 'Véhicule');
    const contractNum = (r.id as string).replace(/-/g, '').slice(0, 8).toUpperCase();
    const clientName  = r.locataire_nom || r.email_client || 'Client';
    const montant     = Number(r.montant_total).toFixed(2) + ' €';

    return buildVEvent({
      uid:         `resa-${r.id}@shipcars.fr`,
      dtstart:     r.date_debut,
      dtend:       r.date_fin,
      summary:     `SC-${contractNum} — ${vehicleName} (${clientName})`,
      description: `Véhicule : ${vehicleName}\nClient : ${clientName}\nMontant : ${montant}`,
      now,
    });
  });

  return new Response(buildCalendar(events, 'Ship Cars — Réservations'), {
    status: 200,
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="shipcars-reservations.ics"',
      'Cache-Control':       'no-cache, no-store, must-revalidate',
    },
  });
};
