// src/pages/api/stripe/caution.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const reservationId = url.searchParams.get('reservation_id');
  const rentalSessionId = url.searchParams.get('rental_session_id');

  if (!reservationId) {
    return new Response('reservation_id manquant', { status: 400 });
  }

  const baseUrl = import.meta.env.PUBLIC_SITE_URL || url.origin;

  // Si on a l'id de la session de location, on redirige vers le récépissé après la caution
  // Sinon (accès direct depuis email de rappel), on affiche la page caution-success
  const successUrl = rentalSessionId
    ? `${baseUrl}/success?session_id=${rentalSessionId}`
    : `${baseUrl}/caution-success?session_id={CHECKOUT_SESSION_ID}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Caution de location — Ship Cars',
            description: 'Empreinte bancaire de 900 € — aucun débit. Les fonds sont libérés après restitution sans incident.',
          },
          unit_amount: 90000,
        },
        quantity: 1,
      }],
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual',
      },
      metadata: {
        type: 'caution',
        reservation_id: reservationId,
      },
      success_url: successUrl,
      cancel_url: `${baseUrl}/caution-obligatoire?session_id=${rentalSessionId ?? ''}`,
    });

    return Response.redirect(session.url!, 302);
  } catch (err: any) {
    console.error('❌ Erreur création session caution:', err);
    return new Response('Erreur création session Stripe', { status: 500 });
  }
};
