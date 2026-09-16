// src/pages/api/stripe/caution-then-rental.ts
// Appelé par Stripe (success_url) juste après l'autorisation de la caution de 900 €.
// Vérifie que la pré-autorisation a bien réussi, enregistre la caution en base,
// puis crée la session de paiement de la location et y redirige le client.
// Si la caution n'a pas pu être autorisée, renvoie vers la fiche véhicule avec une erreur.
export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const reservationId = url.searchParams.get('reservation_id');
  const sessionId = url.searchParams.get('session_id');
  const baseUrl = import.meta.env.PUBLIC_SITE_URL || url.origin;

  if (!reservationId || !sessionId) {
    return new Response('Paramètres manquants', { status: 400 });
  }

  // Récupère la réservation pour retrouver vehicule_id (fallback de redirection en cas d'échec)
  const { data: reservation } = await supabase
    .from('reservations')
    .select('vehicule_id')
    .eq('id', reservationId)
    .single();

  const vehiculeIdFallback = reservation?.vehicule_id ?? '';
  const failRedirect = `${baseUrl}/vehicules/${vehiculeIdFallback}?caution_echec=1`;

  try {
    const cautionSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const pi = cautionSession.payment_intent as Stripe.PaymentIntent | null;

    if (cautionSession.metadata?.reservation_id !== reservationId || !pi || pi.status !== 'requires_capture') {
      console.warn(`⚠️ Caution non autorisée pour résa ${reservationId} — statut PI: ${pi?.status}`);
      return Response.redirect(failRedirect, 302);
    }

    // 1. Caution autorisée — on l'enregistre tout de suite (idempotent avec le webhook)
    await supabase
      .from('reservations')
      .update({ stripe_caution_id: pi.id, caution_statut: 'autorisee' })
      .eq('id', reservationId);

    console.log(`✅ Caution pré-autorisée avant location — résa ${reservationId} — PI: ${pi.id}`);

    // 2. On peut maintenant créer la session de paiement de la location
    const meta = cautionSession.metadata!;
    const finalMontant = parseFloat(meta.montant);
    const vehiculeId = meta.vehicule_id;

    const rentalSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_creation: 'always',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Location : ${meta.vehicule_nom}`,
              description: `Du ${new Date(meta.date_debut).toLocaleString('fr-FR', {timeZone:'Europe/Paris'})} au ${new Date(meta.date_fin).toLocaleString('fr-FR', {timeZone:'Europe/Paris'})}`,
            },
            unit_amount: Math.round(finalMontant * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        reservation_id: reservationId,
        vehicule_id: vehiculeId,
        promo_code: meta.promo_code || '',
        reduction: meta.reduction || '0',
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vehicules/${vehiculeId}`,
    });

    return Response.redirect(rentalSession.url!, 302);

  } catch (err: any) {
    console.error('❌ Erreur caution-then-rental:', err);
    return Response.redirect(failRedirect, 302);
  }
};
