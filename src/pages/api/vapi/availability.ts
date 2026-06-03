// Endpoint appelé par l'agent Vapi pour vérifier les disponibilités.
// Protégé par VAPI_SECRET (Bearer token dans le header Authorization).
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAuthorized(request: Request): boolean {
  const secret = import.meta.env.VAPI_SECRET;
  if (!secret) return true;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Vapi envoie parfois body.arguments comme string JSON — on normalise
function parseArgs(body: unknown): Record<string, string> {
  if (typeof body !== 'object' || body === null) return {};
  const b = body as Record<string, unknown>;

  // Cas 1 : body.arguments est une string JSON → on parse
  if (typeof b.arguments === 'string') {
    try { return JSON.parse(b.arguments); } catch { return {}; }
  }
  // Cas 2 : body.arguments est déjà un objet
  if (typeof b.arguments === 'object' && b.arguments !== null) {
    return b.arguments as Record<string, string>;
  }
  // Cas 3 : les clés sont directement dans le body
  return b as Record<string, string>;
}

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  let args: Record<string, string> = {};
  try {
    const body = await request.json();
    args = parseArgs(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Corps JSON invalide' }), { status: 400 });
  }

  const dateDebut = args.date_debut ?? args.dateDebut ?? null;
  const dateFin   = args.date_fin   ?? args.dateFin   ?? null;

  if (!dateDebut || !dateFin) {
    return new Response(JSON.stringify({
      result: "Je n'ai pas les dates de début et de fin. Pouvez-vous me préciser vos dates de location ?"
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Convertit en timestamp pour comparaison fiable (même logique que le calendrier frontend)
  const start = new Date(dateDebut.includes('T') ? dateDebut : dateDebut + 'T00:00:00');
  const end   = new Date(dateFin.includes('T')   ? dateFin   : dateFin   + 'T23:59:59');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return new Response(JSON.stringify({
      result: "Je n'ai pas compris les dates. Pouvez-vous les préciser au format jour/mois/année ?"
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Récupère véhicules + toutes les réservations/indispos (même logique que occupied-dates.ts)
  const [
    { data: vehicules },
    { data: reservations },
    { data: indisponibilites },
  ] = await Promise.all([
    supabase.from('vehicules').select('id, nom').eq('disponible_resa', true),
    supabase
      .from('reservations')
      .select('vehicule_id, date_debut, date_fin')
      .in('statut', ['paye', 'confirmee', 'en_attente_paiement']),
    supabase
      .from('indisponibilites')
      .select('vehicule_id, date_debut, date_fin'),
  ]);

  if (!vehicules?.length) {
    return new Response(JSON.stringify({
      result: "Aucun véhicule n'est actuellement actif dans notre flotte."
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Fusionne réservations + indispos, puis filtre les chevauchements en JS
  const allOccupied = [
    ...(reservations ?? []).map(r => ({ vehicule_id: r.vehicule_id, from: new Date(r.date_debut.includes('T') ? r.date_debut : r.date_debut + 'T00:00:00'), to: new Date(r.date_fin.includes('T') ? r.date_fin : r.date_fin + 'T23:59:59') })),
    ...(indisponibilites ?? []).map(i => ({ vehicule_id: i.vehicule_id, from: new Date(i.date_debut.includes('T') ? i.date_debut : i.date_debut + 'T00:00:00'), to: new Date(i.date_fin.includes('T') ? i.date_fin : i.date_fin + 'T23:59:59') })),
  ];

  // Chevauchement : la résa commence avant la fin demandée ET finit après le début demandé
  const occupiedIds = new Set(
    allOccupied
      .filter(r => r.from < end && r.to > start)
      .map(r => r.vehicule_id)
  );

  const available   = vehicules.filter(v => !occupiedIds.has(v.id));
  const unavailable = vehicules.filter(v =>  occupiedIds.has(v.id));

  const debutFr = formatDate(dateDebut);
  const finFr   = formatDate(dateFin);

  let result: string;

  if (available.length === 0) {
    const noms = unavailable.map(v => v.nom).join(', ');
    result = `Désolé, aucun véhicule n'est disponible du ${debutFr} au ${finFr}. ${noms} ${unavailable.length > 1 ? 'sont déjà réservés' : 'est déjà réservé'} sur cette période. Souhaitez-vous que je vérifie d'autres dates ?`;
  } else if (available.length === vehicules.length) {
    const noms = available.map(v => v.nom).join(', ');
    result = `Bonne nouvelle ! ${available.length > 1 ? 'Tous nos véhicules sont disponibles' : `${noms} est disponible`} du ${debutFr} au ${finFr}${available.length > 1 ? ` : ${noms}` : ''}. Souhaitez-vous réserver ?`;
  } else {
    const dispo   = available.map(v => v.nom).join(', ');
    const indispo = unavailable.map(v => v.nom).join(', ');
    result = `Du ${debutFr} au ${finFr}, ${available.length > 1 ? 'sont disponibles' : 'est disponible'} : ${dispo}. En revanche, ${indispo} ${unavailable.length > 1 ? 'sont déjà réservés' : 'est déjà réservé'}. Souhaitez-vous réserver l'un des véhicules disponibles ?`;
  }

  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
