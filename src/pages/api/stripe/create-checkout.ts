// src/pages/api/stripe/create-checkout.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { checkDateWindow } from '../promo/validate';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
    vehicule_id, vehicule_nom, date_debut, date_fin, montant, siege_auto, promo_code, reduction,
    email_client, locataire_nom, locataire_date_naissance, locataire_lieu_naissance, locataire_permis_numero, locataire_permis_date, locataire_adresse,
    conducteur2_nom, conducteur2_naissance, conducteur2_lieu_naissance, conducteur2_permis_numero, conducteur2_permis_date,
    permis_recto_url, permis_verso_url, permis_selfie_url,
  } = await request.json();

    // Base URL pour les redirects Stripe :
    // 1. PUBLIC_SITE_URL si défini dans .env (prioritaire — utile en prod)
    // 2. Sinon, on dérive depuis l'origine de la requête (suit automatiquement shipcars.fr vs localhost)
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;

    // Re-vérifie le code promo côté serveur pour empêcher toute manipulation client
    let verifiedPromoCode: string | null = null;
    let verifiedReduction = 0;
    let prixFixeOverride: number | null = null;
    if (promo_code) {
      const { data: promo } = await supabase
        .from('codes_promo')
        .select('code, pourcentage, actif, date_debut_validite, date_fin_validite, prix_fixe_override, jours_avant_max')
        .eq('code', String(promo_code).toUpperCase())
        .maybeSingle();
      if (promo && promo.actif) {
        const windowOk = checkDateWindow(
          promo.date_debut_validite,
          promo.date_fin_validite,
          date_debut,
          date_fin,
        );
        // Vérifie jours_avant_max (location de dernière minute)
        let joursOk = true;
        if (promo.jours_avant_max !== null && promo.jours_avant_max !== undefined && date_debut) {
          const diffDays = (new Date(date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (diffDays > promo.jours_avant_max) joursOk = false;
        }
        if (windowOk.ok && joursOk) {
          verifiedPromoCode = promo.code;
          if (promo.prix_fixe_override !== null) {
            prixFixeOverride = Number(promo.prix_fixe_override);
          } else {
            verifiedReduction = Number(reduction) || 0;
          }
        }
      }
    }

    // Prix final : override si tarif fixe promo, sinon montant client
    const finalMontant = prixFixeOverride !== null ? prixFixeOverride : parseFloat(montant);

    // 1. On crée d'abord une réservation "temporaire" dans Supabase
    // On met le statut à 'en_attente_paiement'
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        vehicule_id,
        date_debut,
        date_fin,
        montant_total: finalMontant,
        statut: 'en_attente_paiement',
        siege_auto: !!siege_auto,
        code_promo: verifiedPromoCode,
        reduction_montant: verifiedReduction,
        email_client:             email_client             || null,
        locataire_nom:            locataire_nom            || null,
        locataire_date_naissance: locataire_date_naissance || null,
        locataire_lieu_naissance: locataire_lieu_naissance || null,
        locataire_permis_numero:  locataire_permis_numero  || null,
        locataire_permis_date:    locataire_permis_date    || null,
        locataire_adresse:        locataire_adresse        || null,
        conducteur2_nom:          conducteur2_nom          || null,
        conducteur2_naissance:    conducteur2_naissance    || null,
        conducteur2_lieu_naissance: conducteur2_lieu_naissance || null,
        conducteur2_permis_numero: conducteur2_permis_numero  || null,
        conducteur2_permis_date:  conducteur2_permis_date  || null,
        permis_recto_url:         permis_recto_url         || null,
        permis_verso_url:         permis_verso_url         || null,
        permis_selfie_url:        permis_selfie_url        || null,
      })
      .select()
      .single();

    if (resError) throw resError;

    // 2. On crée la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_creation: 'always',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Location : ${vehicule_nom}`,
              description: `Du ${new Date(date_debut).toLocaleString('fr-FR', {timeZone:'Europe/Paris'})} au ${new Date(date_fin).toLocaleString('fr-FR', {timeZone:'Europe/Paris'})}`,
            },
            unit_amount: Math.round(finalMontant * 100), // Stripe veut des centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        setup_future_usage: 'off_session',
      },
      // On passe l'ID de la résa en metadata pour la retrouver lors du Webhook
      metadata: {
        reservation_id: reservation.id,
        vehicule_id: vehicule_id,
        promo_code: verifiedPromoCode || '',
        reduction: verifiedReduction.toFixed(2),
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vehicules/${vehicule_id}`,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });

  } catch (error: any) {
    console.error("Erreur Stripe Session:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};