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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GetaroundRental {
  id: string;
  car_id: string;
  start_at: string;
  end_at: string;
  state: string; // 'booked' | 'cancelled' | 'ended' | ...
  user?: { first_name?: string; email?: string };
}

export interface GetaroundUnavailablePeriod {
  starts_at: string;
  ends_at: string;
  reason?: string | null;
  car_id?: number;
}

// ─── Locations (Rentals) ─────────────────────────────────────────────────────

/** Récupère toutes les locations depuis Getaround */
export async function getRentals(): Promise<GetaroundRental[]> {
  const res = await fetch(`${API_BASE}/rentals`, { headers: headers() });
  if (!res.ok) {
    const err = await res.text();
    console.error('[Getaround] getRentals error', res.status, err);
    return [];
  }
  const data = await res.json();
  return data.rentals ?? [];
}

/** Récupère une location spécifique */
export async function getRental(rentalId: string): Promise<GetaroundRental | null> {
  const res = await fetch(`${API_BASE}/rentals/${rentalId}`, { headers: headers() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.rental ?? null;
}

// ─── Périodes d'indisponibilité ───────────────────────────────────────────────

/**
 * Bloque un créneau sur Getaround pour une voiture.
 * L'API renvoie 204 No Content (pas d'ID) — on retourne un booléen.
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
      body: JSON.stringify({ starts_at: startsAt, ends_at: endsAt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Getaround] blockDates error', res.status, err);
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
 * L'API prend starts_at/ends_at dans le corps (pas d'ID).
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
      body: JSON.stringify({ starts_at: startsAt, ends_at: endsAt }),
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

/** Liste les indisponibilités d'une voiture entre deux dates */
export async function getUnavailablePeriods(
  carId: string,
  startDate?: string,
  endDate?: string,
): Promise<GetaroundUnavailablePeriod[]> {
  try {
    const now = new Date();
    const inOneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      start_date: startDate ?? now.toISOString(),
      end_date: endDate ?? inOneYear.toISOString(),
    });
    const res = await fetch(`${API_BASE}/cars/${carId}/unavailabilities.json?${params}`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('[Getaround] getUnavailablePeriods network error', e);
    return [];
  }
}
