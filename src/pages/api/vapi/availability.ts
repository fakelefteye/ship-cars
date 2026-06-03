// Endpoint appelé par l'agent Vapi pour vérifier les disponibilités.
// Protégé par VAPI_SECRET (Bearer token dans le header Authorization).
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAuthorized(request: Request): boolean {
  const secret = import.meta.env.VAPI_SECRET;
  if (!secret) return true; // pas de secret configuré → accès libre (dev uniquement)
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

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  let args: Record<string, string> = {};
  try {
    const body = await request.json();
    // Vapi peut envoyer les arguments directement ou dans body.arguments
    args = body.arguments ?? body;
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

  const { data: vehicules } = await supabase
    .from('vehicules')
    .select('id, nom')
    .eq('disponible_resa', true);

  if (!vehicules?.length) {
    return new Response(JSON.stringify({
      result: "Aucun véhicule n'est actuellement actif dans notre flotte."
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const [{ data: reservations }, { data: indisponibilites }] = await Promise.all([
    supabase
      .from('reservations')
      .select('vehicule_id')
      .in('statut', ['paye', 'confirmee', 'en_attente_paiement'])
      .lt('date_debut', dateFin)
      .gt('date_fin', dateDebut),
    supabase
      .from('indisponibilites')
      .select('vehicule_id')
      .lt('date_debut', dateFin)
      .gt('date_fin', dateDebut),
  ]);

  const occupiedIds = new Set([
    ...(reservations ?? []).map(r => r.vehicule_id),
    ...(indisponibilites ?? []).map(i => i.vehicule_id),
  ]);

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
