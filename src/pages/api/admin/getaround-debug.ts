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

  // Format date simple YYYY-MM-DD (évite tous les problèmes d'encodage URL)
  const toDate = (d: Date) => d.toISOString().slice(0, 10);
  const nowDate = toDate(new Date());
  const in6mDate = toDate(new Date(Date.now() + 180 * 86400_000));

  // Format datetime complet avec encodeURIComponent
  const toGA = (iso: string) => iso.replace(/\.\d{3}Z$/, 'Z');
  const nowDT = encodeURIComponent(toGA(new Date().toISOString()));
  const in6mDT = encodeURIComponent(toGA(new Date(Date.now() + 180 * 86400_000).toISOString()));

  for (const v of vehicules ?? []) {
    const carId = v.getaround_id;
    const existsInGA = carsFromGA.some((c: any) => String(c.id) === String(carId));

    // Test 1 : date simple YYYY-MM-DD
    const url1 = `${API_BASE}/cars/${carId}/unavailabilities.json?start_date=${nowDate}&end_date=${in6mDate}`;
    const r1 = await fetch(url1, { headers });
    const b1 = await r1.text();
    let p1: any; try { p1 = JSON.parse(b1); } catch { p1 = b1; }

    // Test 2 : datetime encodé 2026-05-08T00%3A00%3A00Z
    const url2 = `${API_BASE}/cars/${carId}/unavailabilities.json?start_date=${nowDT}&end_date=${in6mDT}`;
    const r2 = await fetch(url2, { headers });
    const b2 = await r2.text();
    let p2: any; try { p2 = JSON.parse(b2); } catch { p2 = b2; }

    results.push({
      test: `${v.nom} (GA id: ${carId})`,
      id_valide_selon_cars_json: existsInGA,
      format_date_simple: { url: url1, status: r1.status, ok: r1.ok, count: Array.isArray(p1) ? p1.length : '—', error: !r1.ok ? p1 : undefined },
      format_datetime_encode: { url: url2, status: r2.status, ok: r2.ok, count: Array.isArray(p2) ? p2.length : '—', error: !r2.ok ? p2 : undefined },
    });
  }

  return new Response(JSON.stringify({ results, api_key_set: !!apiKey }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
