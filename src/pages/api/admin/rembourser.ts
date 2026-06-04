// src/pages/api/admin/rembourser.ts
// Rembourse une réservation payée : Stripe refund + statut annulée + libération Getaround + email payeur
export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { unblockDates } from '../../../lib/getaround';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const resend  = new Resend(import.meta.env.RESEND_API_KEY);
const FROM_EMAIL  = import.meta.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
}

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  if (!cookies.includes('admin_auth=true')) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  let reservationId: string;
  let motif: string | undefined;
  try {
    const body = await request.json();
    reservationId = body.reservation_id;
    motif = body.motif;
  } catch {
    return new Response(JSON.stringify({ error: 'Corps invalide' }), { status: 400 });
  }

  if (!reservationId) {
    return new Response(JSON.stringify({ error: 'reservation_id requis' }), { status: 400 });
  }

  // 1. Récupère la réservation
  const { data: reservation, error: fetchErr } = await supabase
    .from('reservations')
    .select('*, vehicules(getaround_id, nom)')
    .eq('id', reservationId)
    .single();

  if (fetchErr || !reservation) {
    return new Response(JSON.stringify({ error: 'Réservation introuvable' }), { status: 404 });
  }

  if (reservation.statut === 'annulee') {
    return new Response(JSON.stringify({ error: 'Réservation déjà annulée' }), { status: 400 });
  }

  // 2. Trouve le payment_intent Stripe via la session (recherche par metadata)
  let paymentIntentId: string | null = null;
  try {
    const sessions = await stripe.checkout.sessions.search({
      query: `metadata['reservation_id']:'${reservationId}'`,
      limit: 5,
    });
    const session = sessions.data.find(s => s.payment_status === 'paid');
    if (session) {
      paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as any)?.id ?? null;
    }
  } catch (err: any) {
    console.warn('⚠️ Recherche session Stripe échouée:', err.message);
  }

  // 3. Crée le remboursement Stripe
  let refundId: string | null = null;
  let montantRembourse: number | null = null;

  if (paymentIntentId) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
      });
      refundId = refund.id;
      montantRembourse = refund.amount / 100;
      console.log(`✅ Remboursement Stripe créé : ${refundId} — ${montantRembourse} €`);
    } catch (err: any) {
      console.error('❌ Erreur remboursement Stripe:', err.message);
      return new Response(JSON.stringify({ error: `Stripe : ${err.message}` }), { status: 500 });
    }
  } else {
    console.warn(`⚠️ Aucun payment_intent trouvé pour la réservation ${reservationId} — annulation sans remboursement Stripe`);
  }

  // 4. Marque la réservation comme annulée
  const { error: updateErr } = await supabase
    .from('reservations')
    .update({
      statut: 'annulee',
      rembourse_at: new Date().toISOString(),
      stripe_refund_id: refundId,
      montant_rembourse: montantRembourse ?? reservation.montant_total,
    })
    .eq('id', reservationId);

  if (updateErr) {
    console.error('❌ Supabase update:', updateErr.message);
  }

  // 5. Libère les dates sur Getaround
  let getaroundUnblocked = false;
  const carId = (reservation.vehicules as any)?.getaround_id;
  if (carId && reservation.date_debut && reservation.date_fin) {
    getaroundUnblocked = await unblockDates(String(carId), reservation.date_debut, reservation.date_fin);
    console.log(`🔓 Getaround unblock: ${getaroundUnblocked}`);
  }

  // 6. Envoie l'email de remboursement au payeur
  const payeurEmail = reservation.tiers_payeur_email || reservation.email_client;
  const payeurNom   = reservation.tiers_payeur_nom   || reservation.locataire_nom || 'Client';
  const montantFormate = (montantRembourse ?? Number(reservation.montant_total)).toFixed(2);
  const contractNum = reservationId.replace(/-/g, '').slice(0, 8).toUpperCase();

  if (payeurEmail) {
    try {
      await resend.emails.send({
        from: `Ship Cars <${FROM_EMAIL}>`,
        to: payeurEmail,
        subject: `✅ Remboursement confirmé — Réservation SC-${contractNum}`,
        html: `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:32px auto;padding:0 16px;">
  <div style="background:#0f1e33;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
    <div style="font-size:24px;font-weight:800;color:#fff;">Ship<span style="color:#4dd4c8;">Cars</span></div>
    <div style="font-size:13px;color:#a0b0c0;margin-top:4px;">Confirmation de remboursement</div>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px 32px;border:1px solid #e8eaf0;border-top:none;">
    <p style="font-size:15px;color:#1f2937;margin-bottom:8px;">Bonjour ${payeurNom},</p>
    <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:24px;">
      Votre location a été annulée et un <strong>remboursement de ${montantFormate} €</strong> a été initié sur votre carte bancaire.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:40%;">Réservation</td>
          <td style="padding:6px 0;font-size:13px;color:#1f2937;font-weight:600;">N° SC-${contractNum}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Conducteur</td>
          <td style="padding:6px 0;font-size:13px;color:#1f2937;font-weight:600;">${reservation.locataire_nom || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Départ prévu</td>
          <td style="padding:6px 0;font-size:13px;color:#1f2937;font-weight:600;">${fmt(reservation.date_debut)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Montant remboursé</td>
          <td style="padding:6px 0;font-size:15px;color:#065f46;font-weight:800;">${montantFormate} €</td>
        </tr>
        ${refundId ? `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Référence remboursement</td><td style="padding:6px 0;font-size:12px;color:#6b7280;">${refundId}</td></tr>` : ''}
        ${motif ? `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Motif</td><td style="padding:6px 0;font-size:13px;color:#1f2937;">${motif}</td></tr>` : ''}
      </table>
    </div>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin-bottom:0;">
      Le délai de crédit sur votre compte est généralement de <strong>5 à 10 jours ouvrés</strong> selon votre banque.<br><br>
      Pour toute question, contactez-nous au <strong>06 61 69 11 78</strong> ou par WhatsApp.<br><br>
      <strong style="color:#0f1e33;">L'équipe Ship Cars</strong>
    </p>
  </div>
</div>
</body>
</html>`,
      });
      console.log(`✅ Email remboursement envoyé à : ${payeurEmail}`);
    } catch (err) {
      console.error('❌ Erreur email remboursement:', err);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    reservation_id: reservationId,
    refund_id: refundId,
    montant_rembourse: montantRembourse,
    getaround_unblocked: getaroundUnblocked,
    email_envoye: !!payeurEmail,
  }), { status: 200 });
};
