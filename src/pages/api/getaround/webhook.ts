// src/pages/api/getaround/webhook.ts
// Reçoit les événements temps réel de Getaround (résa créée / annulée).
// URL à communiquer à Getaround : https://[votre-domaine]/api/getaround/webhook
export const prerender = false;

import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

// Vérifie la signature HMAC SHA1 envoyée par Getaround dans X-Drivy-Signature
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = import.meta.env.GETAROUND_WEBHOOK_SECRET;
  if (!secret) {
    // Si le secret n'est pas configuré, on laisse passer (dev / test ping)
    console.warn('[getaround/webhook] GETAROUND_WEBHOOK_SECRET non configuré — signature non vérifiée');
    return true;
  }
  if (!signature) return false;

  const expected = 'sha1=' + createHmac('sha1', secret).update(rawBody).digest('hex');

  // Comparaison en temps constant pour éviter les timing attacks
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  // 1. Lire le corps brut AVANT de le parser (nécessaire pour la signature)
  const rawBody = await request.text();
  const signature = request.headers.get('x-drivy-signature');

  // 2. Vérifier la signature
  if (!verifySignature(rawBody, signature)) {
    console.error('[getaround/webhook] Signature invalide');
    return new Response('Signature invalide', { status: 401 });
  }

  // 3. Parser le payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const eventType: string = payload?.type ?? '';
  console.log('[getaround/webhook] event:', eventType, 'at:', payload?.occurred_at);

  // 4. Répondre immédiatement au ping de test
  if (eventType === 'ping') {
    return new Response(JSON.stringify({ received: true, pong: true }), { status: 200 });
  }

  // 5. Traitement asynchrone des événements de location
  const rental = payload?.data?.rental ?? payload?.data ?? null;

  if (!rental?.id) {
    return new Response(JSON.stringify({ received: true, skipped: 'no rental data' }), {
      status: 200,
    });
  }

  // Cherche le véhicule correspondant au car_id Getaround
  const { data: vehicule } = await supabase
    .from('vehicules')
    .select('id')
    .eq('getaround_id', String(rental.car_id))
    .single();

  // Événements de création / confirmation
  if (
    eventType === 'rental.booked' ||
    eventType === 'rental.created' ||
    eventType === 'rental.confirmed' ||
    eventType === 'rental.started'
  ) {
    if (vehicule) {
      await supabase.from('indisponibilites').upsert(
        {
          vehicule_id: vehicule.id,
          date_debut: rental.start_at,
          date_fin: rental.end_at,
          source: 'getaround',
          getaround_rental_id: String(rental.id),
          note: `Location Getaround #${rental.id}`,
        },
        { onConflict: 'getaround_rental_id' },
      );
    }
  }

  // Événements d'annulation
  if (
    eventType === 'rental.cancelled' ||
    eventType === 'rental.canceled' ||
    rental.state === 'cancelled'
  ) {
    await supabase
      .from('indisponibilites')
      .delete()
      .eq('getaround_rental_id', String(rental.id));
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
