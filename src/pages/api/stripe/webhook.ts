// src/pages/api/stripe/webhook.ts
export const prerender = false;
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const resend = new Resend(import.meta.env.RESEND_API_KEY);

const OWNER_EMAIL = 'bill.shipcars@gmail.com';
const CAUTION_URL = 'https://buy.stripe.com/votre_lien_de_caution_800';

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

function buildContractHtml(res: Record<string, any>, veh: Record<string, any> | null): string {
  const contractNum = res.id
    ? (res.id as string).replace(/-/g, '').slice(0, 8).toUpperCase()
    : '—';
  const diffDays = Math.max(1, Math.ceil(
    (new Date(res.date_fin).getTime() - new Date(res.date_debut).getTime()) / 86400000
  ));

  const row = (label: string, value: string | null | undefined) =>
    value ? `
      <tr>
        <td style="padding:10px 8px;font-weight:600;color:#1f2937;width:42%;border-bottom:1px solid #f3f4f6;font-size:14px;vertical-align:top;">${label}</td>
        <td style="padding:10px 8px;color:#374151;border-bottom:1px solid #f3f4f6;font-size:14px;vertical-align:top;">${value}</td>
      </tr>` : '';

  return `
  <div style="background:#fff;color:#1a1a2e;border-radius:12px;padding:32px;max-width:700px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
    <!-- En-tête -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:2px solid #e8eaf0;padding-bottom:20px;margin-bottom:28px;">
      <tr>
        <td>
          <span style="font-size:22px;font-weight:800;color:#0f1e33;">Ship<span style="color:#4dd4c8;">Cars</span></span>
        </td>
        <td align="right">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e;">Contrat de location</div>
          <div style="font-size:12px;color:#6b7280;margin-top:3px;">N° SC-${contractNum}</div>
        </td>
      </tr>
    </table>

    <!-- Section Réservation -->
    <div style="font-size:11px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.09em;padding-bottom:8px;border-bottom:1px solid #e8eaf0;margin-bottom:4px;">Réservation</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Date de réservation', fmt(res.created_at))}
      ${row('Horaire de début', fmt(res.date_debut))}
      ${row('Horaire de fin', fmt(res.date_fin))}
      ${row('Prix de la réservation', Number(res.montant_total).toFixed(2) + ' €')}
      ${row('Distance incluse', diffDays * 100 + ' km')}
      ${row('Prix additionnel par km', '0,36 €')}
      ${row('Nom du propriétaire', 'Ship Cars')}
      ${row('Protection', 'Standard')}
    </table>

    <!-- Section Locataire -->
    <div style="font-size:11px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.09em;padding-bottom:8px;border-bottom:1px solid #e8eaf0;margin-bottom:4px;">Informations du locataire</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${veh ? row('Véhicule', `${veh.nom}${veh.modele ? ` — ${veh.modele}` : ''}${veh.annee ? ` (${veh.annee})` : ''}`) : ''}
      ${veh?.immatriculation ? row('Plaque d\'immatriculation', veh.immatriculation) : ''}
      ${veh?.carburant ? row('Carburant', veh.carburant) : ''}
      ${row('Nom du locataire', res.locataire_nom)}
      ${row('Date de naissance', fmtDate(res.locataire_date_naissance))}
      ${row('Numéro de permis', res.locataire_permis_numero)}
      ${row('Date d\'obtention du permis', fmtDate(res.locataire_permis_date))}
      ${row('Adresse', res.locataire_adresse)}
      ${row('Email', res.email_client)}
    </table>

    <p style="font-size:11px;color:#9ca3af;line-height:1.6;border-top:1px solid #e8eaf0;padding-top:14px;margin-top:8px;">
      Les informations fournies par le locataire peuvent, le cas échéant, être corrigées en fonction d'éléments découverts ultérieurement.
      Ce document fait office de contrat de location entre Ship Cars (propriétaire) et le locataire identifié ci-dessus.
    </p>
  </div>`;
}

function tenantEmailHtml(contractHtml: string, cautionUrl: string): string {
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:740px;margin:32px auto;padding:0 16px;">

      <!-- Bandeau confirmation -->
      <div style="background:#0f1e33;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#fff;margin-bottom:6px;">Ship<span style="color:#4dd4c8;">Cars</span></div>
        <div style="font-size:14px;color:#a0b0c0;">Votre contrat de location</div>
      </div>

      <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px 32px;border:1px solid #e8eaf0;border-top:none;">
        <p style="font-size:15px;color:#1f2937;margin-bottom:24px;">
          Bonjour,<br><br>
          Votre paiement a été validé. Vous trouverez ci-dessous votre contrat de location Ship Cars.
        </p>

        ${contractHtml}

        <!-- Bloc caution -->
        <div style="background:#f0f7ff;border:2px solid #3498db;border-radius:10px;padding:24px;margin:28px 0;text-align:center;">
          <h3 style="color:#2980b9;margin:0 0 10px;font-size:16px;">⚠️ Action requise : La Caution</h3>
          <p style="color:#374151;font-size:14px;margin:0 0 20px;line-height:1.6;">
            Pour récupérer le véhicule, vous devez déposer une <strong>empreinte bancaire de 800,00 €</strong>.<br>
            <em style="color:#7f8c8d;font-size:13px;">Cette somme n'est pas débitée de votre compte.</em>
          </p>
          <a href="${cautionUrl}"
             style="background:#3498db;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
            Sécuriser ma caution (800 €)
          </a>
        </div>

        <p style="font-size:13px;color:#6b7280;margin-top:24px;">
          À bientôt sur la route,<br>
          <strong style="color:#0f1e33;">L'équipe Ship Cars</strong>
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

function ownerEmailHtml(contractHtml: string, res: Record<string, any>): string {
  const permisSection = (res.permis_recto_url || res.permis_verso_url || res.permis_selfie_url)
    ? `
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:20px;margin:20px 0;">
        <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:12px;">📷 Photos du permis de conduire</div>
        <table cellpadding="0" cellspacing="0">
          ${res.permis_recto_url ? `<tr><td style="padding:4px 0;font-size:13px;color:#374151;">Recto :</td><td style="padding:4px 8px;"><a href="${res.permis_recto_url}" style="color:#2563eb;">Voir la photo</a></td></tr>` : ''}
          ${res.permis_verso_url ? `<tr><td style="padding:4px 0;font-size:13px;color:#374151;">Verso :</td><td style="padding:4px 8px;"><a href="${res.permis_verso_url}" style="color:#2563eb;">Voir la photo</a></td></tr>` : ''}
          ${res.permis_selfie_url ? `<tr><td style="padding:4px 0;font-size:13px;color:#374151;">Selfie :</td><td style="padding:4px 8px;"><a href="${res.permis_selfie_url}" style="color:#2563eb;">Voir la photo</a></td></tr>` : ''}
        </table>
      </div>`
    : '';

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:740px;margin:32px auto;padding:0 16px;">
      <div style="background:#0f1e33;border-radius:12px 12px 0 0;padding:20px 28px;">
        <div style="font-size:20px;font-weight:800;color:#fff;">Ship<span style="color:#4dd4c8;">Cars</span> — Nouvelle réservation</div>
      </div>
      <div style="background:#fff;border-radius:0 0 12px 12px;padding:24px 28px;border:1px solid #e8eaf0;border-top:none;">
        <p style="font-size:14px;color:#1f2937;margin-bottom:20px;">
          Une nouvelle réservation vient d'être payée. Voici le contrat et les documents du locataire.
        </p>

        ${permisSection}
        ${contractHtml}

        <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
          Cet email vous est envoyé automatiquement à chaque paiement confirmé.
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservation_id;
    const customerEmail = session.customer_details?.email;

    console.log(`🔔 Session reçue — résa: ${reservationId} — email: ${customerEmail}`);

    if (reservationId) {
      // 1. Mise à jour du statut
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ statut: 'paye' })
        .eq('id', reservationId);

      if (updateError) {
        console.error('❌ Erreur maj Supabase:', updateError.message);
      } else {
        console.log(`✅ Réservation ${reservationId} marquée comme PAYÉE.`);
      }

      // 2. Récupération de la réservation complète avec le véhicule
      const { data: res } = await supabase
        .from('reservations')
        .select('*, vehicules(*)')
        .eq('id', reservationId)
        .single();

      if (res) {
        const veh = res.vehicules ?? null;
        const contractHtml = buildContractHtml(res, veh);
        const contractNum = res.id
          ? (res.id as string).replace(/-/g, '').slice(0, 8).toUpperCase()
          : reservationId;

        const emailClient = res.email_client || customerEmail;

        // 3a. Email au locataire
        if (emailClient) {
          try {
            await resend.emails.send({
              from: 'Ship Cars <onboarding@resend.dev>',
              to: emailClient,
              subject: `Votre contrat de location Ship Cars — N° SC-${contractNum}`,
              html: tenantEmailHtml(contractHtml, CAUTION_URL),
            });
            console.log(`✅ Contrat envoyé au locataire : ${emailClient}`);
          } catch (err) {
            console.error('❌ Erreur email locataire:', err);
          }
        }

        // 3b. Email au propriétaire
        try {
          await resend.emails.send({
            from: 'Ship Cars <onboarding@resend.dev>',
            to: OWNER_EMAIL,
            subject: `[Nouvelle résa] ${res.locataire_nom || emailClient || 'Client'} — SC-${contractNum}`,
            html: ownerEmailHtml(contractHtml, res),
          });
          console.log(`✅ Contrat envoyé au propriétaire : ${OWNER_EMAIL}`);
        } catch (err) {
          console.error('❌ Erreur email propriétaire:', err);
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
