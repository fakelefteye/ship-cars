// src/pages/api/getaround/webhook.ts
// Reçoit les événements temps réel de Getaround.
// URL à enregistrer dans Getaround : https://[votre-domaine]/api/getaround/webhook
//
// Flux rental.booked / rental.canceled :
//   1. Le webhook envoie le rental_id dans data
//   2. On appelle GET /rentals/{id}.json pour récupérer starts_at, ends_at, car_id
//   3. On upsert / supprime dans indisponibilites
//
// Flux unavailability.created / unavailability.deleted :
//   Les dates sont dans le payload directement (starts_at, ends_at, car_id)
export const prerender = false;

import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { getRental, getUserById } from '../../../lib/getaround';
import { upsertBrevoContact } from '../../../lib/brevo';

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = import.meta.env.GETAROUND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhook] GETAROUND_WEBHOOK_SECRET non configuré — signature non vérifiée');
    return true;
  }
  if (!signature) return false;
  const expected = 'sha1=' + createHmac('sha1', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function logEvent(eventType: string, payload: any, result: string, error?: string) {
  try {
    await supabase.from('webhook_events').insert({
      event_type: eventType,
      payload,
      result,
      error: error ?? null,
    });
  } catch {
    // table absente ou erreur DB — ne bloque pas le traitement
  }
}

export const POST: APIRoute = async ({ request }) => {
  let rawBody = '';
  let payload: any = {};
  let eventType = 'unknown';

  try {
    rawBody = await request.text();
    const signature = request.headers.get('x-drivy-signature');

    if (!verifySignature(rawBody, signature)) {
      console.error('[webhook] Signature invalide');
      await logEvent('unknown', {}, 'rejected_signature');
      return new Response('Signature invalide', { status: 401 });
    }

    try { payload = JSON.parse(rawBody); }
    catch {
      await logEvent('parse_error', { raw: rawBody.slice(0, 500) }, 'error', 'Invalid JSON');
      return new Response('Invalid JSON', { status: 400 });
    }

    eventType = payload?.type ?? '';
    console.log('[webhook] event:', eventType, 'at:', payload?.occurred_at, '| data:', JSON.stringify(payload?.data));

    // Ping de test Getaround
    if (eventType === 'ping') {
      await logEvent('ping', payload, 'pong');
      return new Response(JSON.stringify({ received: true, pong: true }), { status: 200 });
    }

    // ── Événements de LOCATION ──────────────────────────────────────────────────
    if (
      eventType === 'rental.booked' ||
      eventType === 'rental.created' ||
      eventType === 'rental.confirmed' ||
      eventType === 'rental.started' ||
      eventType === 'rental.cancelled' ||
      eventType === 'rental.canceled'
    ) {
      const data     = payload?.data ?? {};
      const rentalId = data.rental_id ?? data.id ?? data;

      if (!rentalId) {
        console.warn('[webhook] rental_id introuvable dans payload', JSON.stringify(payload));
        await logEvent(eventType, payload, 'skipped', 'no rental_id');
        return new Response(JSON.stringify({ received: true, skipped: 'no rental_id' }), { status: 200 });
      }

      // Annulation : on supprime sans appeler l'API
      if (eventType === 'rental.cancelled' || eventType === 'rental.canceled') {
        const { error: delErr } = await supabase
          .from('indisponibilites')
          .delete()
          .eq('getaround_rental_id', String(rentalId));
        if (delErr) console.error('[webhook] erreur suppression:', delErr.message);
        console.log('[webhook] rental annulé, indisponibilite supprimée:', rentalId);
        await logEvent(eventType, payload, 'deleted', delErr?.message);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Réservation : on récupère les détails via GET /rentals/{id}.json
      const rental = await getRental(rentalId);
      if (!rental) {
        console.error('[webhook] Impossible de récupérer le rental', rentalId);
        await logEvent(eventType, payload, 'error', `rental fetch failed for id=${rentalId}`);
        return new Response(JSON.stringify({ received: true, error: 'rental fetch failed' }), { status: 200 });
      }

      console.log('[webhook] rental récupéré:', rental.id, rental.starts_at, '→', rental.ends_at, 'car:', rental.car_id);

      // ── Sync CRM Brevo (uniquement sur rental.booked) ─────────────────────
      if ((eventType === 'rental.booked' || eventType === 'rental.created') && (rental as any).user_id) {
        const userId = (rental as any).user_id;
        try {
          const gaUser = await getUserById(userId);
          if (gaUser) {
            await upsertBrevoContact(gaUser, {
              rental_id: rental.id,
              car_id:    rental.car_id,
              starts_at: rental.starts_at,
              ends_at:   rental.ends_at,
            });
          } else {
            console.warn('[webhook] getUserById returned null pour user_id', userId);
          }
        } catch (brevoErr: any) {
          // Ne bloque pas le reste du traitement
          console.error('[webhook] Erreur sync Brevo:', brevoErr?.message ?? brevoErr);
        }
      }

      const { data: vehicule } = await supabase
        .from('vehicules')
        .select('id')
        .eq('getaround_id', String(rental.car_id))
        .single();

      if (!vehicule) {
        console.warn('[webhook] voiture Getaround non trouvée en base:', rental.car_id);
        await logEvent(eventType, payload, 'skipped', `car_id=${rental.car_id} not in vehicules`);
        return new Response(JSON.stringify({ received: true, skipped: 'car not found' }), { status: 200 });
      }

      const { error: upsertErr } = await supabase.from('indisponibilites').upsert(
        {
          vehicule_id:         vehicule.id,
          date_debut:          rental.starts_at,
          date_fin:            rental.ends_at,
          source:              'getaround',
          getaround_rental_id: String(rental.id),
          note:                `Location Getaround #${rental.id}`,
        },
        { onConflict: 'getaround_rental_id' },
      );
      if (upsertErr) console.error('[webhook] erreur upsert:', upsertErr.message);

      console.log('[webhook] indisponibilite upsertée pour rental', rental.id);
      await logEvent(eventType, payload, upsertErr ? 'error' : 'upserted', upsertErr?.message);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // ── Événements d'INDISPONIBILITÉ (blocage propriétaire depuis l'app GA) ──────
    if (eventType === 'unavailability.created') {
      const { starts_at, ends_at, car_id } = payload?.data ?? {};
      if (starts_at && ends_at && car_id) {
        const { data: vehicule } = await supabase
          .from('vehicules')
          .select('id')
          .eq('getaround_id', String(car_id))
          .single();

        if (vehicule) {
          const { error: insErr } = await supabase.from('indisponibilites').insert({
            vehicule_id: vehicule.id,
            date_debut:  starts_at,
            date_fin:    ends_at,
            source:      'getaround',
            note:        'Blocage Getaround (app propriétaire)',
          });
          if (insErr) console.error('[webhook] erreur insert unavailability:', insErr.message);
          await logEvent(eventType, payload, insErr ? 'error' : 'inserted', insErr?.message);
        } else {
          console.warn('[webhook] car_id non trouvé pour unavailability:', car_id);
          await logEvent(eventType, payload, 'skipped', `car_id=${car_id} not in vehicules`);
        }
      } else {
        console.warn('[webhook] unavailability.created : données manquantes', JSON.stringify(payload?.data));
        await logEvent(eventType, payload, 'skipped', 'missing starts_at/ends_at/car_id');
      }
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    if (eventType === 'unavailability.deleted') {
      const { starts_at, ends_at, car_id } = payload?.data ?? {};
      if (starts_at && ends_at && car_id) {
        const { data: vehicule } = await supabase
          .from('vehicules')
          .select('id')
          .eq('getaround_id', String(car_id))
          .single();

        if (vehicule) {
          const { error: delErr } = await supabase
            .from('indisponibilites')
            .delete()
            .eq('vehicule_id', vehicule.id)
            .eq('date_debut', starts_at)
            .eq('date_fin', ends_at)
            .is('getaround_rental_id', null);
          if (delErr) console.error('[webhook] erreur delete unavailability:', delErr.message);
          await logEvent(eventType, payload, delErr ? 'error' : 'deleted', delErr?.message);
        } else {
          await logEvent(eventType, payload, 'skipped', `car_id=${car_id} not in vehicules`);
        }
      }
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Événement inconnu
    console.log('[webhook] event inconnu ignoré:', eventType);
    await logEvent(eventType, payload, 'ignored');
    return new Response(JSON.stringify({ received: true, skipped: eventType }), { status: 200 });

  } catch (err: any) {
    console.error('[webhook] ERREUR NON GÉRÉE:', err?.message ?? err);
    // On log l'erreur mais on renvoie 200 pour que Getaround ne réessaie pas indéfiniment
    await logEvent(eventType, payload, 'unhandled_error', err?.message ?? String(err)).catch(() => {});
    return new Response(JSON.stringify({ received: true, error: 'internal error' }), { status: 200 });
  }
};
