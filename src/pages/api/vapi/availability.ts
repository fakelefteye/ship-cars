// Endpoint appelé par l'agent Vapi pour vérifier les disponibilités.
// Protégé par VAPI_SECRET (Bearer token dans le header Authorization).
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAuthorized(request: Request): boolean {
  const secret = import.meta.env.VAPI_SECRET;
  if (!secret) return true;
  const auth = request.headers.get('authorization') ?? '';
  // Accepte "Bearer <secret>" ou directement "<secret>"
  return auth === `Bearer ${secret}` || auth === secret;
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

interface VehicleInfo {
  nom: string;
  modele: string;
  prixParJour: number;
}

interface AvailabilityResult {
  available: boolean;
  availableVehicles: VehicleInfo[];
  unavailableVehicles: VehicleInfo[];
  dateDebut: string;
  dateFin: string;
  error?: string;
}

async function checkAvailability(dateDebut: string, dateFin: string): Promise<AvailabilityResult> {
  const start = new Date(dateDebut.includes('T') ? dateDebut : dateDebut + 'T00:00:00');
  const end   = new Date(dateFin.includes('T')   ? dateFin   : dateFin   + 'T23:59:59');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { available: false, availableVehicles: [], unavailableVehicles: [], dateDebut, dateFin, error: 'invalid_dates' };
  }

  const [
    { data: vehicules, error: vErr },
    { data: reservations, error: rErr },
    { data: indisponibilites, error: iErr },
  ] = await Promise.all([
    supabase.from('vehicules').select('id, nom, modele, prix_journalier_base, prix_basse').eq('disponible_resa', true),
    supabase.from('reservations').select('vehicule_id, date_debut, date_fin').in('statut', ['paye', 'confirmee', 'en_attente_paiement']),
    supabase.from('indisponibilites').select('vehicule_id, date_debut, date_fin'),
  ]);

  if (vErr || rErr || iErr) {
    return { available: false, availableVehicles: [], unavailableVehicles: [], dateDebut, dateFin, error: 'db_error' };
  }

  if (!vehicules?.length) {
    return { available: false, availableVehicles: [], unavailableVehicles: [], dateDebut, dateFin, error: 'no_vehicles' };
  }


  const toDate = (s: string) => new Date(s.includes('T') ? s : s + 'T00:00:00');

  const allOccupied = [
    ...(reservations ?? []).map(r => ({ vehicule_id: r.vehicule_id, from: toDate(r.date_debut), to: toDate(r.date_fin) })),
    ...(indisponibilites ?? []).map(i => ({ vehicule_id: i.vehicule_id, from: toDate(i.date_debut), to: toDate(i.date_fin) })),
  ];

  const occupiedIds = new Set(
    allOccupied.filter(r => r.from < end && r.to > start).map(r => r.vehicule_id)
  );

  const toVehicleInfo = (v: typeof vehicules[0]) => ({
    nom: v.nom,
    modele: v.modele ?? '',
    prixParJour: Math.min(v.prix_basse ?? v.prix_journalier_base ?? 0, v.prix_journalier_base ?? 0),
  });

  const availableVehicles   = vehicules.filter(v => !occupiedIds.has(v.id)).map(toVehicleInfo);
  const unavailableVehicles = vehicules.filter(v =>  occupiedIds.has(v.id)).map(toVehicleInfo);

  return {
    available: availableVehicles.length > 0,
    availableVehicles,
    unavailableVehicles,
    dateDebut,
    dateFin,
  };
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// GET — test manuel dans le navigateur
// Ex: /api/vapi/availability?date_debut=2026-06-06&date_fin=2026-06-07
export const GET: APIRoute = async ({ url }) => {
  const dateDebut = url.searchParams.get('date_debut') ?? '';
  const dateFin   = url.searchParams.get('date_fin')   ?? '';
  if (!dateDebut || !dateFin) {
    return json({ usage: 'Ajoutez ?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD' });
  }
  return json(await checkAvailability(dateDebut, dateFin));
};

// POST — appelé par Vapi
export const POST: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) {
    return json({ error: 'Non autorisé' }, 401);
  }

  let args: Record<string, string> = {};
  try {
    const body = await request.json();
    args = parseArgs(body);
  } catch {
    return json({ error: 'Corps JSON invalide' }, 400);
  }

  const dateDebut = args.date_debut ?? args.dateDebut ?? null;
  const dateFin   = args.date_fin   ?? args.dateFin   ?? null;

  if (!dateDebut || !dateFin) {
    return json({
      available: false,
      availableVehicles: [],
      unavailableVehicles: [],
      dateDebut: dateDebut ?? '',
      dateFin: dateFin ?? '',
      error: 'missing_dates',
    });
  }

  return json(await checkAvailability(dateDebut, dateFin));
};
