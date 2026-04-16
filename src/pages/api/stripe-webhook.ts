// src/pages/api/stripe-webhook.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// Ce code est déclenché par Stripe de manière invisible
export const POST: APIRoute = async ({ request }) => {
  const payload = await request.json();
  const eventType = payload.type;

  // Si la caution a bien été bloquée (Pré-autorisation validée)
  if (eventType === 'payment_intent.requires_capture') {
    const paymentIntent = payload.data.object;
    
    // On met à jour la réservation dans Supabase
    await supabase
      .from('reservations')
      .update({ statut: 'confirmee', stripe_caution_id: paymentIntent.id })
      .eq('stripe_payment_intent_id', paymentIntent.id);
      
    // C'est ici que l'on pourrait déclencher l'envoi du message automatique "Post-résa"
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};