// src/lib/unavailability-classifier.ts
// Détermine l'origine d'une indisponibilité Getaround pour l'étiqueter correctement.
//
// Getaround renvoie pour chaque période une `reason` :
//   booked | check_up | repairs | connect_issues | repatriation | other
// Or le site bloque Getaround pour ses propres réservations avec reason "booked" (cf.
// stripe/webhook.ts et reservations/create.ts), soit exactement la valeur d'une vraie location
// Getaround ; ses blocages admin partent en "other". La reason seule ne permet donc pas de
// savoir qui a créé la période : on la rapproche des enregistrements que le site a lui-même
// créés. Getaround ne renvoie pas d'identifiant de période dans cette liste, seules les dates
// servent à faire le lien.

export type GetaroundReason =
  | 'booked' | 'check_up' | 'repairs' | 'connect_issues' | 'repatriation' | 'other';

export const REASON_LABELS: Record<GetaroundReason, string> = {
  booked:         'Location Getaround',
  check_up:       'Contrôle / entretien',
  repairs:        'Réparations',
  connect_issues: 'Problème boîtier Connect',
  repatriation:   'Rapatriement',
  other:          'Blocage Getaround',
};

// Valeurs possibles de indisponibilites.source pour les lignes recalculées par la synchro.
// ('manual' n'en fait pas partie : ces lignes sont créées à la main et jamais écrasées.)
export const SYNCED_SOURCES = [
  'getaround',
  'getaround_check_up',
  'getaround_repairs',
  'getaround_connect_issues',
  'getaround_repatriation',
  'getaround_other',
  'site',
];

// Getaround arrondit à la demi-heure (cf. toGA) : on tolère cet écart sur chaque borne.
const TOLERANCE_MS = 30 * 60 * 1000;

export interface SelfBlock {
  kind: 'site' | 'manual';
  start: number;
  end: number;
  label?: string;
  periodId?: string | null;
}

export interface PeriodLike {
  id?: string | number;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
}

export type Classification =
  | { skip: true }
  | { skip: false; source: string; note: string };

function normalizeReason(reason: string | null | undefined): GetaroundReason {
  return reason && reason in REASON_LABELS ? (reason as GetaroundReason) : 'other';
}

function findSelfBlock(period: PeriodLike, blocks: SelfBlock[]): SelfBlock | null {
  const start = new Date(period.starts_at).getTime();
  const end   = new Date(period.ends_at).getTime();
  if (isNaN(start) || isNaN(end)) return null;

  // 1. Identifiant Getaround identique : correspondance certaine
  if (period.id != null) {
    const byId = blocks.find(b => b.periodId && String(b.periodId) === String(period.id));
    if (byId) return byId;
  }
  // 2. Mêmes bornes à la tolérance près
  return blocks.find(b =>
    Math.abs(b.start - start) <= TOLERANCE_MS && Math.abs(b.end - end) <= TOLERANCE_MS,
  ) ?? null;
}

export function classifyUnavailability(period: PeriodLike, selfBlocks: SelfBlock[]): Classification {
  const reason = normalizeReason(period.reason);

  // Quelle que soit la reason : une vraie location Getaround ne peut pas chevaucher une
  // réservation du site sur la même voiture, donc une période aux mêmes dates vient du site.
  const own = findSelfBlock(period, selfBlocks);
  if (own?.kind === 'manual') return { skip: true };   // la ligne manuelle existe déjà
  if (own?.kind === 'site') {
    return { skip: false, source: 'site', note: own.label ? `Réservation site — ${own.label}` : 'Réservation site' };
  }

  const source = reason === 'booked' ? 'getaround' : `getaround_${reason}`;
  return { skip: false, source, note: `Getaround — ${REASON_LABELS[reason]}` };
}

/**
 * Charge les blocages que le site a lui-même créés pour un véhicule :
 * réservations payées/confirmées (qui bloquent Getaround) et blocages manuels admin.
 */
export async function loadSelfBlocks(
  supabase: any,
  vehiculeId: string,
  fromISO: string,
  toISO: string,
): Promise<SelfBlock[]> {
  const [{ data: resas }, { data: manuals }] = await Promise.all([
    supabase.from('reservations')
      .select('date_debut, date_fin, locataire_nom, getaround_unavailable_period_id')
      .eq('vehicule_id', vehiculeId)
      .in('statut', ['paye', 'confirmee'])
      .lte('date_debut', toISO)
      .gte('date_fin', fromISO),
    supabase.from('indisponibilites')
      .select('date_debut, date_fin')
      .eq('vehicule_id', vehiculeId)
      .eq('source', 'manual')
      .lte('date_debut', toISO)
      .gte('date_fin', fromISO),
  ]);

  return [
    ...(resas ?? []).map((r: any): SelfBlock => ({
      kind: 'site',
      start: new Date(r.date_debut).getTime(),
      end: new Date(r.date_fin).getTime(),
      label: r.locataire_nom || undefined,
      periodId: r.getaround_unavailable_period_id ?? null,
    })),
    ...(manuals ?? []).map((m: any): SelfBlock => ({
      kind: 'manual',
      start: new Date(m.date_debut).getTime(),
      end: new Date(m.date_fin).getTime(),
    })),
  ];
}
