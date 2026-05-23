// src/lib/getaround.ts — Client API Getaround Owner v1
export const prerender = false;

const API_BASE = 'https://api-eu.getaround.com/owner/v1';

function apiKey(): string {
  return import.meta.env.GETAROUND_API_KEY ?? '';
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey()}`,
    'Content-Type': 'application/json',
  };
}

// Formate une date au format attendu par l'API Getaround :
//   "2026-05-25T12:00:00.000+02:00"
// Règles :
//   - Offset Paris réel (+01:00 en hiver, +02:00 en été) — pas UTC
//   - Millisecondes obligatoires (.000)
//   - Granularité 30 min (arrondi à la demi-heure la plus proche)
function toGA(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;

  // Arrondi à la demi-heure la plus proche
  const HALF_HOUR = 30 * 60 * 1000;
  const rounded = new Date(Math.round(d.getTime() / HALF_HOUR) * HALF_HOUR);

  // Heure locale Paris (sv-SE donne "YYYY-MM-DD HH:mm:ss")
  const localStr = rounded
    .toLocaleString('sv-SE', { timeZone: 'Europe/Paris' })
    .replace(' ', 'T');

  // Offset Paris en minutes (écart entre heure Paris lue comme UTC et heure UTC réelle)
  const parisAsUTC = new Date(localStr + 'Z').getTime();
  const offsetMin  = Math.round((parisAsUTC - rounded.getTime()) / 60000);
  const sign       = offsetMin >= 0 ? '+' : '-';
  const absMin     = Math.abs(offsetMin);
  const hh         = String(Math.floor(absMin / 60)).padStart(2, '0');
  const mm         = String(absMin % 60).padStart(2, '0');

  return `${localStr}.000${sign}${hh}:${mm}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GetaroundUser {
  id: number | string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  birth_date?: string;
  license_country?: string;
  license_first_issue_date?: string;
  license_number?: string;
}

export interface GetaroundRental {
  id: number | string;
  car_id: number | string;
  starts_at: string;
  ends_at: string;
  state: string; // 'booked' | 'cancelled' | 'ended' | ...
}

export interface GetaroundUnavailablePeriod {
  id?: string | number;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
  car_id?: number;
}

// ─── Locations (Rentals) ─────────────────────────────────────────────────────

/**
 * Récupère une location par son ID.
 * GET /rentals/{id}.json
 * L'API renvoie soit { rental: {...} } soit l'objet directement.
 */
export async function getRental(rentalId: string | number): Promise<GetaroundRental | null> {
  try {
    const res = await fetch(`${API_BASE}/rentals/${rentalId}.json`, { headers: headers() });
    if (!res.ok) {
      console.error('[Getaround] getRental error', res.status, rentalId);
      return null;
    }
    const data = await res.json();
    // L'API peut renvoyer { rental: {...} } ou directement {...}
    return data.rental ?? (data.id ? data : null);
  } catch (e) {
    console.error('[Getaround] getRental network error', e);
    return null;
  }
}

// ─── Utilisateurs ────────────────────────────────────────────────────────────

/**
 * Récupère les informations d'un locataire Getaround par son user_id.
 * GET /users/{user_id}.json
 */
export async function getUserById(userId: string | number): Promise<GetaroundUser | null> {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}.json`, { headers: headers() });
    if (!res.ok) {
      console.error('[Getaround] getUserById error', res.status, userId);
      return null;
    }
    const data = await res.json();
    return data.user ?? (data.id ? data : null);
  } catch (e) {
    console.error('[Getaround] getUserById network error', e);
    return null;
  }
}

// ─── Indisponibilités ─────────────────────────────────────────────────────────

/**
 * Bloque un créneau sur Getaround pour une voiture.
 * POST /cars/{car_id}/unavailabilities.json
 * Retourne l'objet créé (avec id si disponible) ou null en cas d'erreur.
 */
export async function blockDates(
  carId: string,
  startsAt: string,
  endsAt: string,
  reason: string = 'other',
): Promise<GetaroundUnavailablePeriod | null> {
  const start = toGA(startsAt);
  const end   = toGA(endsAt);
  try {
    const res = await fetch(`${API_BASE}/cars/${carId}/unavailabilities.json`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ starts_at: start, ends_at: end, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Getaround] blockDates error', res.status, JSON.stringify(err), { carId, start, end });
      return null;
    }
    // 201 → parse le body pour récupérer l'id ; 204 → pas de body
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return { starts_at: start, ends_at: end };
    }
    const data = await res.json().catch(() => null);
    return data ?? { starts_at: start, ends_at: end };
  } catch (e) {
    console.error('[Getaround] blockDates network error', e);
    return null;
  }
}

/**
 * Supprime une indisponibilité sur Getaround par plage de dates.
 * DELETE /cars/{car_id}/unavailabilities.json
 */
export async function unblockDates(
  carId: string,
  startsAt: string,
  endsAt: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/cars/${carId}/unavailabilities.json`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ starts_at: toGA(startsAt), ends_at: toGA(endsAt) }),
    });
    if (!res.ok) {
      console.error('[Getaround] unblockDates error', res.status, carId, startsAt, endsAt);
    }
    return res.ok;
  } catch (e) {
    console.error('[Getaround] unblockDates network error', e);
    return false;
  }
}

/**
 * Liste les indisponibilités d'une voiture entre deux dates.
 * GET /cars/{car_id}/unavailabilities.json?start_date=...&end_date=...
 */
export async function getUnavailablePeriods(
  carId: string,
  startDate?: string,
  endDate?: string,
): Promise<GetaroundUnavailablePeriod[]> {
  try {
    const now = new Date();
    const inOneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      start_date: toGA(startDate ?? now.toISOString()),
      end_date:   toGA(endDate   ?? inOneYear.toISOString()),
    });
    const res = await fetch(`${API_BASE}/cars/${carId}/unavailabilities.json?${params}`, {
      headers: headers(),
    });
    if (!res.ok) {
      console.error('[Getaround] getUnavailablePeriods error', res.status, carId);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[Getaround] getUnavailablePeriods network error', e);
    return [];
  }
}
