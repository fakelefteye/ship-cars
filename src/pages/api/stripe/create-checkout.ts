// src/pages/api/stripe/create-checkout.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { checkDateWindow } from '../promo/validate';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { vehicule_id, vehicule_nom, date_debut, date_fin, montant, siege_auto, promo_code, reduction } = await request.json();

    // Re-vérifie le code promo côté serveur pour empêcher toute manipulation client
    let verifiedPromoCode: string | null = null;
    let verifiedReduction = 0;
    if (promo_code) {
      const { data: promo } = await supabase
        .from('codes_promo')
        .select('code, pourcentage, actif, date_debut_validite, date_fin_validite')
        .eq('code', String(promo_code).toUpperCase())
        .maybeSingle();
      if (promo && promo.actif) {
        const windowOk = checkDateWindow(
          promo.date_debut_validite,
          promo.date_fin_validite,
          date_debut,
          date_fin,
        );
        if (windowOk.ok) {
          verifiedPromoCode = promo.code;
          verifiedReduction = Number(reduction) || 0;
        }
      }
    }

    // 1. On crée d'abord une réservation "temporaire" dans Supabase
    // On met le statut à 'en_attente_paiement'
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        vehicule_id,
        date_debut,
        date_fin,
        montant_total: parseFloat(montant),
        statut: 'en_attente_paiement',
        siege_auto: !!siege_auto,
        code_promo: verifiedPromoCode,
        reduction_montant: verifiedReduction,
      })
      .select()
      .single();

    if (resError) throw resError;

    // 2. On crée la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Location : ${vehicule_nom}`,
              description: `Du ${new Date(date_debut).toLocaleString('fr-FR')} au ${new Date(date_fin).toLocaleString('fr-FR')}`,
            },
            unit_amount: Math.round(parseFloat(montant) * 100), // Stripe veut des centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // On passe l'ID de la résa en metadata pour la retrouver lors du Webhook
      metadata: {
        reservation_id: reservation.id,
        vehicule_id: vehicule_id,
        promo_code: verifiedPromoCode || '',
        reduction: verifiedReduction.toFixed(2),
      },
      success_url: `${import.meta.env.PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/vehicules/${vehicule_id}`,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });

  } catch (error: any) {
    console.error("Erreur Stripe Session:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};