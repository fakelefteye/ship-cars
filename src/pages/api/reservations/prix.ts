// src/pages/api/reservations/prix.ts
// Calcule le prix total d'une période en tenant compte des tarifs dynamiques
// et des prix de saison (faible / moyenne / forte / très forte).
// GET ?vehicule_id=xxx&date_debut=ISO&date_fin=ISO&zone=A|B|C
export const prerender = false;

import { supabaseAdmin as supabase } from '../../../lib/supabase';

// ── Données vacances scolaires ────────────────────────────────────────────────
const VACANCES: Record<string, { l: string; d: string; f: string }[]> = {
  A:[{l:'Toussaint',d:'2025-10-18',f:'2025-11-03'},{l:'Noël',d:'2025-12-20',f:'2026-01-05'},
     {l:'Hiver',d:'2026-02-21',f:'2026-03-09'},{l:'Printemps',d:'2026-04-18',f:'2026-05-04'},
     {l:'Été',d:'2026-07-04',f:'2026-08-31'},{l:'Toussaint',d:'2026-10-17',f:'2026-11-02'},
     {l:'Noël',d:'2026-12-19',f:'2027-01-04'},{l:'Hiver',d:'2027-02-20',f:'2027-03-08'},
     {l:'Printemps',d:'2027-04-10',f:'2027-04-26'},{l:'Été',d:'2027-07-03',f:'2027-08-31'}],
  B:[{l:'Toussaint',d:'2025-10-18',f:'2025-11-03'},{l:'Noël',d:'2025-12-20',f:'2026-01-05'},
     {l:'Hiver',d:'2026-02-07',f:'2026-02-23'},{l:'Printemps',d:'2026-04-25',f:'2026-05-11'},
     {l:'Été',d:'2026-07-04',f:'2026-08-31'},{l:'Toussaint',d:'2026-10-17',f:'2026-11-02'},
     {l:'Noël',d:'2026-12-19',f:'2027-01-04'},{l:'Hiver',d:'2027-02-06',f:'2027-02-22'},
     {l:'Printemps',d:'2027-04-17',f:'2027-05-03'},{l:'Été',d:'2027-07-03',f:'2027-08-31'}],
  C:[{l:'Toussaint',d:'2025-10-18',f:'2025-11-03'},{l:'Noël',d:'2025-12-20',f:'2026-01-05'},
     {l:'Hiver',d:'2026-02-14',f:'2026-03-02'},{l:'Printemps',d:'2026-04-11',f:'2026-04-27'},
     {l:'Été',d:'2026-07-04',f:'2026-08-31'},{l:'Toussaint',d:'2026-10-17',f:'2026-11-02'},
     {l:'Noël',d:'2026-12-19',f:'2027-01-04'},{l:'Hiver',d:'2027-02-13',f:'2027-03-01'},
     {l:'Printemps',d:'2027-04-03',f:'2027-04-19'},{l:'Été',d:'2027-07-03',f:'2027-08-31'}],
};

const FERIES = new Set([
  '2026-01-01','2026-04-06','2026-05-01','2026-05-08','2026-05-14','2026-05-25',
  '2026-07-14','2026-08-15','2026-11-01','2026-11-11','2026-12-25',
  '2027-01-01','2027-04-05','2027-05-01','2027-05-08','2027-05-13','2027-05-24',
  '2027-07-14','2027-08-15','2027-11-01','2027-11-11','2027-12-25',
]);

function getVacance(ds: string, zone: string) {
  return (VACANCES[zone] ?? VACANCES.B).find(v => ds >= v.d && ds <= v.f) ?? null;
}

function getDayTier(ds: string, zone: string): 'tres_haute' | 'haute' | 'moyenne' | 'basse' {
  const vac = getVacance(ds, zone);
  if (vac?.l === 'Été') return 'tres_haute';
  if (vac || FERIES.has(ds)) return 'haute';
  const dow = new Date(ds + 'T12:00:00').getDay();
  if (dow === 0 || dow === 6) return 'moyenne';
  return 'basse';
}

export const GET = async ({ url }: { url: URL }) => {
  const vehiculeId = url.searchParams.get('vehicule_id');
  const dateDebut  = url.searchParams.get('date_debut');
  const dateFin    = url.searchParams.get('date_fin');
  const zone       = url.searchParams.get('zone') ?? 'B';

  if (!vehiculeId || !dateDebut || !dateFin) {
    return new Response(JSON.stringify({ error: 'vehicule_id, date_debut, date_fin requis' }), { status: 400 });
  }

  const start = new Date(dateDebut);
  const end   = new Date(dateFin);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return new Response(JSON.stringify({ error: 'Dates invalides' }), { status: 400 });
  }

  const diffH    = (end.getTime() - start.getTime()) / 3_600_000;
  const diffDays = Math.max(1, Math.ceil(diffH / 24));

  const { data: vehicule } = await supabase
    .from('vehicules')
    .select('prix_journalier_base, prix_basse, prix_moyenne, prix_haute, prix_tres_haute')
    .eq('id', vehiculeId)
    .single();

  const prixBase      = vehicule?.prix_journalier_base ?? 0;
  const prixBasse     = vehicule?.prix_basse      ?? prixBase;
  const prixMoyenne   = vehicule?.prix_moyenne    ?? prixBase;
  const prixHaute     = vehicule?.prix_haute      ?? prixBase;
  const prixTresHaute = vehicule?.prix_tres_haute ?? prixHaute;

  const startDate = start.toISOString().split('T')[0];
  const endDate   = end.toISOString().split('T')[0];

  const { data: tarifs } = await supabase
    .from('tarifs_dynamiques')
    .select('date_debut, date_fin, prix_journalier, label')
    .eq('vehicule_id', vehiculeId)
    .lte('date_debut', endDate)
    .gte('date_fin', startDate);

  const breakdown: { date: string; prix: number; tier: string; label?: string }[] = [];
  let total = 0;

  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];

    const matching = (tarifs ?? []).filter(t => t.date_debut <= ds && t.date_fin >= ds);
    matching.sort((a, b) => {
      const la = new Date(a.date_fin).getTime() - new Date(a.date_debut).getTime();
      const lb = new Date(b.date_fin).getTime() - new Date(b.date_debut).getTime();
      return la - lb;
    });
    const tarif = matching[0] ?? null;

    let prix: number;
    let tier: string;
    if (tarif) {
      prix = Number(tarif.prix_journalier);
      tier = 'custom';
    } else {
      tier = getDayTier(ds, zone);
      if (tier === 'tres_haute')  prix = prixTresHaute;
      else if (tier === 'haute')  prix = prixHaute;
      else if (tier === 'moyenne') prix = prixMoyenne;
      else                        prix = prixBasse;
    }

    breakdown.push({ date: ds, prix, tier, label: tarif?.label ?? undefined });
    total += prix;
  }

  return new Response(
    JSON.stringify({ total: +total.toFixed(2), days: diffDays, prix_base: prixBase, breakdown }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
