// src/pages/api/admin/set-reglage.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { setReglage } from '../../../lib/reglages';

export const POST: APIRoute = async ({ request }) => {
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  const cookies = request.headers.get('cookie') || '';

  if (!cookies.includes('admin_auth=true') && !adminPassword) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });
  }

  try {
    const body = await request.json();

    // Valide et sauvegarde chaque réglage
    const updates: Record<string, string> = {};

    if (body.prix_km_supplementaire !== undefined) {
      const prix = parseFloat(body.prix_km_supplementaire);
      if (isNaN(prix) || prix < 0) {
        return new Response(JSON.stringify({ error: 'prix_km_supplementaire invalide' }), { status: 400 });
      }
      updates.prix_km_supplementaire = prix.toString();
    }

    if (body.prix_litre_carburant !== undefined) {
      const prix = parseFloat(body.prix_litre_carburant);
      if (isNaN(prix) || prix < 0) {
        return new Response(JSON.stringify({ error: 'prix_litre_carburant invalide' }), { status: 400 });
      }
      updates.prix_litre_carburant = prix.toString();
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'Aucun réglage à mettre à jour' }), { status: 400 });
    }

    // Sauvegarde en base
    for (const [key, value] of Object.entries(updates)) {
      await setReglage(key, value);
      console.log(`✅ ${key} mis à jour — valeur: ${value}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error('❌ Erreur set-reglage:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
