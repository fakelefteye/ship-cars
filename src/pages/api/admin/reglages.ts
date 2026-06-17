// src/pages/api/admin/reglages.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { getReglage, setReglage } from '../../../lib/reglages';

const ALLOWED_KEYS = [
  'prix_km_supplementaire', 'forcer_2j_weekend', 'prix_litre_carburant',
  'km_inclus_par_jour', 'montant_caution', 'franchise_vol', 'penalite_tabac',
];

export const GET: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  if (!cookies.includes('admin_auth=true')) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  const results: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    results[key] = await getReglage(key);
  }
  return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  if (!cookies.includes('admin_auth=true')) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps invalide' }), { status: 400 });
  }

  const BOOLEAN_KEYS = ['forcer_2j_weekend'];

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key)) continue;
    if (BOOLEAN_KEYS.includes(key)) {
      await setReglage(key, value === 'true' ? 'true' : 'false');
    } else {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return new Response(JSON.stringify({ error: `Valeur invalide pour ${key}` }), { status: 400 });
      }
      await setReglage(key, num.toFixed(2));
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
