// src/pages/api/admin/getaround-debug.ts
// Teste la connexion Getaround pour chaque voiture et retourne le diagnostic.
// GET /api/admin/getaround-debug
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAdmin(req: Request) {
  return (req.headers.get('cookie') || '').includes('admin_auth=true');
}

const API_BASE = 'https://api-eu.getaround.com/owner/v1';

export const GET: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) return new Response('Non autorisé', { status: 401 });

  const apiKey = import.meta.env.GETAROUND_API_KEY ?? '';
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const results: any[] = [];

  // 1. Test clé API — liste les voitures
  let carsFromGA: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/cars.json`, { headers });
    const body = await res.text();
    let parsed: any;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    carsFromGA = Array.isArray(parsed) ? parsed : (parsed?.cars ?? []);
    results.push({
      test: 'GET /cars.json',
      status: res.status,
      ok: res.ok,
      cars_count: carsFromGA.length,
      cars: carsFromGA,
    });
  } catch (e: any) {
    results.push({ test: 'GET /cars.json', error: e.message });
  }

  // 2. Pour chaque voiture en base, test l'API unavailabilities
  const { data: vehicules } = await supabase
    .from('vehicules')
    .select('id, nom, getaround_id')
    .not('getaround_id', 'is', null);

  // Dates de test — format ISO8601 +00:00 (comme l'exemple quick start de la doc GA)
  const d1 = new Date(); d1.setUTCHours(0,0,0,0);
  const d2 = new Date(d1.getTime() + 30 * 86400_000); // 30j max (limite API)
  const toGA = (d: Date) => d.toISOString().slice(0, 19) + '+00:00';

  const tryFetch = async (url: string) => {
    const r = await fetch(url, { headers });
    const b = await r.text();
    let p: any; try { p = JSON.parse(b); } catch { p = b; }
    return { status: r.status, ok: r.ok, count: Array.isArray(p) ? p.length : '—', data: r.ok ? p?.slice?.(0,3) : undefined, error: !r.ok ? (p || '(vide)') : undefined };
  };

  // On teste seulement les 3 premières voitures pour éviter le throttle
  for (const v of (vehicules ?? []).slice(0, 3)) {
    const carId = v.getaround_id;
    const existsInGA = carsFromGA.some((c: any) => String(c.id) === String(carId));
    const base = `${API_BASE}/cars/${carId}/unavailabilities.json`;

    // URLSearchParams encode automatiquement + en %2B et : en %3A
    const params = new URLSearchParams({ start_date: toGA(d1), end_date: toGA(d2) });

    const tests: Record<string, any> = {
      [`start_date=${toGA(d1)} (URLSearchParams encodé)`]: await tryFetch(`${base}?${params}`),
    };

    results.push({ test: `${v.nom} (GA id: ${carId})`, id_valide: existsInGA, url_testée: `${base}?${params}`, ...tests });
  }

  return new Response(JSON.stringify({ results, api_key_set: !!apiKey }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
