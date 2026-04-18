// src/pages/api/stripe/webhook.ts
export const prerender = false;
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST = async ({ request }) => {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erreur Signature Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Événement : Paiement de la location réussi
  if (event.type === 'checkout.session.completed') {
    // On force le typage pour avoir accès à toutes les propriétés
    const session = event.data.object as Stripe.Checkout.Session;
    
    const reservationId = session.metadata?.reservation_id;
    // Stripe récupère l'email saisi dans le formulaire ici :
    const customerEmail = session.customer_details?.email;
    
    // Ton lien de caution SHIP CARS (utilise le lien direct vers ta page success ou le lien direct Stripe)
    const cautionUrl = "https://buy.stripe.com/votre_lien_de_caution_800"; 

    console.log(`🔔 Session reçue pour la résa: ${reservationId} - Email client: ${customerEmail}`);

    if (reservationId) {
      // 1. Mise à jour du statut dans Supabase
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ statut: 'paye' })
        .eq('id', reservationId);

      if (updateError) {
        console.error("❌ Erreur maj Supabase:", updateError.message);
      } else {
        console.log(`✅ Réservation ${reservationId} marquée comme PAYÉE.`);
      }
    }

    // 2. Envoi de l'email via Resend si on a un email client
    if (customerEmail) {
      try {
        const data = await resend.emails.send({
          from: 'SHIP CARS <onboarding@resend.dev>', // Garde ça pour le test, puis change après validation domaine
          to: customerEmail,
          subject: '🚀 Finalisez votre réservation - Caution SHIP CARS',
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto;">
              <h2 style="color: #2c3e50;">Merci pour votre confiance !</h2>
              <p>Votre paiement pour la location chez <strong>SHIP CARS</strong> a été validé avec succès.</p>
              
              <div style="background: #f0f7ff; padding: 25px; border-radius: 12px; border: 2px solid #3498db; margin: 20px 0;">
                <h3 style="color: #2980b9; margin-top: 0;">⚠️ Action requise : La Caution</h3>
                <p>Pour finaliser votre dossier et pouvoir récupérer le véhicule, vous devez maintenant déposer une empreinte bancaire de <strong>800,00€</strong>.</p>
                <div style="text-align: center; margin-top: 25px;">
                  <a href="${cautionUrl}" style="background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.1rem; display: inline-block;">
                    Sécuriser ma caution (800€)
                  </a>
                </div>
                <p style="font-size: 0.85rem; margin-top: 20px; color: #7f8c8d; text-align: center;">
                  <em>Rappel : Cette somme n'est pas débitée de votre compte.</em>
                </p>
              </div>
              
              <p>À très vite pour votre trajet !<br>L'équipe <strong>SHIP CARS</strong></p>
            </div>
          `
        });
        console.log(`✅ Email envoyé avec succès. ID: ${data.data?.id}`);
      } catch (mailError) {
        console.error("❌ Erreur envoi email Resend:", mailError);
      }
    } else {
      console.error("❌ Aucun email trouvé dans la session Stripe.");
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};