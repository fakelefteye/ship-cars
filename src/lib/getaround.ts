// src/lib/getaround.ts — Client API Getaround Owner v1
export const prerender = false;

const API_BASE = 'https://api.getaround.com/owner/v1';

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
  id: string;
  start_date: string;
  end_date: string;
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
 * Renvoie l'id de la période créée (à stocker pour pouvoir la supprimer).
 */
export async function blockDates(
  carId: string,
  startAt: string,
  endAt: string,
): Promise<GetaroundUnavailablePeriod | null> {
  const res = await fetch(`${API_BASE}/cars/${carId}/unavailable_periods`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      unavailable_period: { start_date: startAt, end_date: endAt },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Getaround] blockDates error', res.status, err);
    return null;
  }
  const data = await res.json();
  return data.unavailable_period ?? null;
}

/**
 * Supprime une période d'indisponibilité sur Getaround (déblocage).
 * Renvoie true si succès.
 */
export async function unblockDates(carId: string, periodId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/cars/${carId}/unavailable_periods/${periodId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) {
    console.error('[Getaround] unblockDates error', res.status, carId, periodId);
  }
  return res.ok;
}

/** Liste les périodes d'indisponibilité d'une voiture */
export async function getUnavailablePeriods(
  carId: string,
): Promise<GetaroundUnavailablePeriod[]> {
  const res = await fetch(`${API_BASE}/cars/${carId}/unavailable_periods`, {
    headers: headers(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.unavailable_periods ?? [];
}
