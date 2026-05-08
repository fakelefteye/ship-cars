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

  // Dates de test — midnight UTC, sans encodage des colons
  const d1 = new Date(); d1.setUTCHours(0,0,0,0);
  const d2 = new Date(d1.getTime() + 180 * 86400_000);
  const raw = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z'); // "2026-05-08T00:00:00Z"

  const tryFetch = async (url: string) => {
    const r = await fetch(url, { headers });
    const b = await r.text();
    let p: any; try { p = JSON.parse(b); } catch { p = b; }
    return { status: r.status, ok: r.ok, count: Array.isArray(p) ? p.length : '—', data: r.ok ? p : undefined, error: !r.ok ? (p || '(vide)') : undefined };
  };

  for (const v of vehicules ?? []) {
    const carId = v.getaround_id;
    const existsInGA = carsFromGA.some((c: any) => String(c.id) === String(carId));
    const base = `${API_BASE}/cars/${carId}/unavailabilities.json`;
    const s = raw(d1), e = raw(d2);

    // Les 4 combinaisons à tester
    const tests: Record<string, any> = {
      'start_date brut (T:Z non encodé)':    await tryFetch(`${base}?start_date=${s}&end_date=${e}`),
      'starts_at brut':                       await tryFetch(`${base}?starts_at=${s}&ends_at=${e}`),
      'start_date encodé (%3A)':              await tryFetch(`${base}?start_date=${encodeURIComponent(s)}&end_date=${encodeURIComponent(e)}`),
      'start-date (tiret)':                   await tryFetch(`${base}?start-date=${s}&end-date=${e}`),
    };

    results.push({ test: `${v.nom} (GA id: ${carId})`, id_valide: existsInGA, ...tests });
  }

  return new Response(JSON.stringify({ results, api_key_set: !!apiKey }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
