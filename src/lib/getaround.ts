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

// RFC3339 sans millisecondes : "2026-05-08T17:30:00Z" — pour POST/DELETE body
function toGA(iso: string): string {
  return iso.replace(/\.\d{3}Z$/, 'Z');
}

// YYYY-MM-DD — pour les paramètres GET (unavailabilities)
function toDateParam(iso: string): string {
  return iso.slice(0, 10);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GetaroundRental {
  id: number | string;
  car_id: number | string;
  starts_at: string;
  ends_at: string;
  state: string; // 'booked' | 'cancelled' | 'ended' | ...
}

export interface GetaroundUnavailablePeriod {
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

// ─── Indisponibilités ─────────────────────────────────────────────────────────

/**
 * Bloque un créneau sur Getaround pour une voiture.
 * POST /cars/{car_id}/unavailabilities.json
 * Renvoie 204 No Content — on retourne un booléen.
 */
export async function blockDates(
  carId: string,
  startsAt: string,
  endsAt: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/cars/${carId}/unavailabilities.json`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ starts_at: toGA(startsAt), ends_at: toGA(endsAt) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Getaround] blockDates error', res.status, JSON.stringify(err));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Getaround] blockDates network error', e);
    return false;
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
      start_date: toDateParam(startDate ?? now.toISOString()),
      end_date:   toDateParam(endDate   ?? inOneYear.toISOString()),
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
