// src/pages/api/reservations/prix.ts
// Calcule le prix total d'une période en tenant compte des tarifs dynamiques.
// GET ?vehicule_id=xxx&date_debut=ISO&date_fin=ISO
export const prerender = false;

import { supabaseAdmin as supabase } from '../../../lib/supabase';

export const GET = async ({ url }: { url: URL }) => {
  const vehiculeId = url.searchParams.get('vehicule_id');
  const dateDebut  = url.searchParams.get('date_debut');
  const dateFin    = url.searchParams.get('date_fin');

  if (!vehiculeId || !dateDebut || !dateFin) {
    return new Response(JSON.stringify({ error: 'vehicule_id, date_debut, date_fin requis' }), { status: 400 });
  }

  const start = new Date(dateDebut);
  const end   = new Date(dateFin);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return new Response(JSON.stringify({ error: 'Dates invalides' }), { status: 400 });
  }

  // Nombre de jours facturés (arrondi supérieur)
  const diffH    = (end.getTime() - start.getTime()) / 3_600_000;
  const diffDays = Math.max(1, Math.ceil(diffH / 24));

  // Prix de base du véhicule
  const { data: vehicule } = await supabase
    .from('vehicules')
    .select('prix_journalier_base')
    .eq('id', vehiculeId)
    .single();

  const prixBase = vehicule?.prix_journalier_base ?? 0;

  // Tarifs dynamiques qui chevauchent la période
  const startDate = start.toISOString().split('T')[0]; // YYYY-MM-DD
  const endDate   = end.toISOString().split('T')[0];

  const { data: tarifs } = await supabase
    .from('tarifs_dynamiques')
    .select('date_debut, date_fin, prix_journalier, label, couleur')
    .eq('vehicule_id', vehiculeId)
    .lte('date_debut', endDate)
    .gte('date_fin', startDate);

  // Calcule le prix pour chaque jour
  const breakdown: { date: string; prix: number; label?: string }[] = [];
  let total = 0;

  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];

    // Cherche un tarif dynamique couvrant ce jour (le premier trouvé gagne)
    const tarif = tarifs?.find((t) => t.date_debut <= ds && t.date_fin >= ds);
    const prix  = tarif ? Number(tarif.prix_journalier) : prixBase;

    breakdown.push({ date: ds, prix, label: tarif?.label ?? undefined });
    total += prix;
  }

  return new Response(
    JSON.stringify({ total: +total.toFixed(2), days: diffDays, prix_base: prixBase, breakdown }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
