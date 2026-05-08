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

  const toGA = (iso: string) => iso.replace(/\.\d{3}Z$/, 'Z');
  const now = toGA(new Date().toISOString());
  const in6m = toGA(new Date(Date.now() + 180 * 86400_000).toISOString());

  for (const v of vehicules ?? []) {
    const carId = v.getaround_id;
    // Vérifie si ce car_id existe dans la liste Getaround
    const existsInGA = carsFromGA.some((c: any) => String(c.id) === String(carId));

    try {
      const url = `${API_BASE}/cars/${carId}/unavailabilities.json?start_date=${now}&end_date=${in6m}`;
      const res = await fetch(url, { headers });
      const body = await res.text();
      let parsed: any;
      try { parsed = JSON.parse(body); } catch { parsed = body; }

      results.push({
        test: `${v.nom} (GA id: ${carId})`,
        id_valide_selon_cars_json: existsInGA,
        status: res.status,
        ok: res.ok,
        periodes_count: Array.isArray(parsed) ? parsed.length : '—',
        periodes: Array.isArray(parsed) ? parsed : undefined,
        error: !res.ok ? parsed : undefined,
      });
    } catch (e: any) {
      results.push({ test: `${v.nom} (GA id: ${carId})`, error: e.message });
    }
  }

  return new Response(JSON.stringify({ results, api_key_set: !!apiKey }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
