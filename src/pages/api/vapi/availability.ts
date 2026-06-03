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

function parseArgs(body: unknown): Record<string, string> {
  if (typeof body !== 'object' || body === null) return {};
  const b = body as Record<string, unknown>;
  if (typeof b.arguments === 'string') {
    try { return JSON.parse(b.arguments); } catch { return {}; }
  }
  if (typeof b.arguments === 'object' && b.arguments !== null) {
    return b.arguments as Record<string, string>;
  }
  return b as Record<string, string>;
}

async function checkAvailability(dateDebut: string, dateFin: string): Promise<string> {
  const start = new Date(dateDebut.includes('T') ? dateDebut : dateDebut + 'T00:00:00');
  const end   = new Date(dateFin.includes('T')   ? dateFin   : dateFin   + 'T23:59:59');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "Je n'ai pas compris les dates. Pouvez-vous les préciser au format jour/mois/année ?";
  }

  const [
    { data: vehicules, error: vErr },
    { data: reservations, error: rErr },
    { data: indisponibilites, error: iErr },
  ] = await Promise.all([
    supabase.from('vehicules').select('id, nom').eq('disponible_resa', true),
    supabase.from('reservations').select('vehicule_id, date_debut, date_fin').in('statut', ['paye', 'confirmee', 'en_attente_paiement']),
    supabase.from('indisponibilites').select('vehicule_id, date_debut, date_fin'),
  ]);

  if (vErr || rErr || iErr) {
    return `Erreur base de données : ${vErr?.message ?? rErr?.message ?? iErr?.message}`;
  }

  if (!vehicules?.length) {
    return "Aucun véhicule n'est actuellement actif dans notre flotte.";
  }

  const toDate = (s: string) => new Date(s.includes('T') ? s : s + 'T00:00:00');

  const allOccupied = [
    ...(reservations ?? []).map(r => ({ vehicule_id: r.vehicule_id, from: toDate(r.date_debut), to: toDate(r.date_fin) })),
    ...(indisponibilites ?? []).map(i => ({ vehicule_id: i.vehicule_id, from: toDate(i.date_debut), to: toDate(i.date_fin) })),
  ];

  const occupiedIds = new Set(
    allOccupied.filter(r => r.from < end && r.to > start).map(r => r.vehicule_id)
  );

  const available   = vehicules.filter(v => !occupiedIds.has(v.id));
  const unavailable = vehicules.filter(v =>  occupiedIds.has(v.id));

  const debutFr = formatDate(dateDebut);
  const finFr   = formatDate(dateFin);

  if (available.length === 0) {
    const noms = unavailable.map(v => v.nom).join(', ');
    return `Désolé, aucun véhicule n'est disponible du ${debutFr} au ${finFr}. ${noms} ${unavailable.length > 1 ? 'sont déjà réservés' : 'est déjà réservé'} sur cette période. Souhaitez-vous que je vérifie d'autres dates ?`;
  } else if (available.length === vehicules.length) {
    const noms = available.map(v => v.nom).join(', ');
    return `Bonne nouvelle ! ${available.length > 1 ? 'Tous nos véhicules sont disponibles' : `${noms} est disponible`} du ${debutFr} au ${finFr}${available.length > 1 ? ` : ${noms}` : ''}. Souhaitez-vous réserver ?`;
  } else {
    const dispo   = available.map(v => v.nom).join(', ');
    const indispo = unavailable.map(v => v.nom).join(', ');
    return `Du ${debutFr} au ${finFr}, ${available.length > 1 ? 'sont disponibles' : 'est disponible'} : ${dispo}. En revanche, ${indispo} ${unavailable.length > 1 ? 'sont déjà réservés' : 'est déjà réservé'}. Souhaitez-vous réserver l'un des véhicules disponibles ?`;
  }
}

// GET — test manuel dans le navigateur
// Ex: /api/vapi/availability?date_debut=2026-06-06&date_fin=2026-06-07
export const GET: APIRoute = async ({ url }) => {
  const dateDebut = url.searchParams.get('date_debut') ?? '';
  const dateFin   = url.searchParams.get('date_fin')   ?? '';

  if (!dateDebut || !dateFin) {
    return new Response(JSON.stringify({ usage: 'Ajoutez ?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await checkAvailability(dateDebut, dateFin);
  return new Response(JSON.stringify({ result }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

// POST — appelé par Vapi
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

  const result = await checkAvailability(dateDebut, dateFin);
  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
