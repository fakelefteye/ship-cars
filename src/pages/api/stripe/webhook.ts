// src/pages/api/stripe/webhook.ts
export const prerender = false;
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { blockDates } from '../../../lib/getaround';
// pdfkit en import dynamique — un crash pdf ne tue pas tout le webhook

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const resend = new Resend(import.meta.env.RESEND_API_KEY);

const OWNER_EMAIL = 'bill.shipcars@gmail.com';
const BASE_URL    = import.meta.env.PUBLIC_SITE_URL || 'https://www.shipcars.fr';
// Expéditeur configurable : mettre RESEND_FROM_EMAIL=noreply@shipcars.fr dans Vercel une fois le domaine vérifié
const FROM_EMAIL  = import.meta.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
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
      ${row('Prix km supplémentaire', '0,40 € TTC / km')}
      ${row('Nom du propriétaire', 'Ship Cars')}
      ${row('Protection', 'Standard')}
    </table>

    <!-- Section État du véhicule au départ -->
    <div style="font-size:11px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.09em;padding-bottom:8px;border-bottom:1px solid #e8eaf0;margin-bottom:4px;">État du véhicule au départ</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${veh ? row('Véhicule', `${veh.nom}${veh.modele ? ` — ${veh.modele}` : ''}${veh.annee ? ` (${veh.annee})` : ''}`) : ''}
      ${veh?.immatriculation ? row('Plaque d\'immatriculation', veh.immatriculation) : ''}
      ${veh?.carburant ? row('Type de carburant', veh.carburant) : ''}
      ${veh?.kilometrage_depart != null ? row('Kilométrage au départ', `${Number(veh.kilometrage_depart).toLocaleString('fr-FR')} km`) : ''}
      ${veh?.carburant_depart ? row('Niveau de carburant au départ', veh.carburant_depart) : ''}
    </table>

    <!-- Section Locataire -->
    <div style="font-size:11px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.09em;padding-bottom:8px;border-bottom:1px solid #e8eaf0;margin-bottom:4px;">Informations du locataire</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Nom du locataire', res.locataire_nom)}
      ${row('Date de naissance', fmtDate(res.locataire_date_naissance))}
      ${res.locataire_lieu_naissance ? row('Lieu de naissance', res.locataire_lieu_naissance) : ''}
      ${row('Numéro de permis', res.locataire_permis_numero)}
      ${row('Date d\'obtention du permis', fmtDate(res.locataire_permis_date))}
      ${row('Adresse', res.locataire_adresse)}
      ${row('Email', res.email_client)}
    </table>
    ${res.conducteur2_nom ? `
    <div style="font-size:11px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.09em;padding-bottom:8px;border-bottom:1px solid #e8eaf0;margin-bottom:4px;">Conducteur supplémentaire</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Nom', res.conducteur2_nom)}
      ${res.conducteur2_naissance ? row('Date de naissance', fmtDate(res.conducteur2_naissance)) : ''}
      ${res.conducteur2_lieu_naissance ? row('Lieu de naissance', res.conducteur2_lieu_naissance) : ''}
      ${res.conducteur2_permis_numero ? row('N° de permis', res.conducteur2_permis_numero) : ''}
      ${res.conducteur2_permis_date ? row('Permis obtenu le', fmtDate(res.conducteur2_permis_date)) : ''}
    </table>` : ''}

    <!-- Conditions Générales résumées -->
    <div style="border-top:2px solid #e8eaf0;margin-top:16px;padding-top:16px;">
      <div style="font-size:11px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:10px;">Rappel des conditions essentielles</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;vertical-align:top;width:42%;font-weight:600;">Kilométrage inclus</td><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">100 km / jour — dépassement facturé <strong>0,40 € TTC / km</strong></td></tr>
        <tr><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;font-weight:600;">Carburant</td><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">Restitution au niveau constaté au départ — frais de remise à niveau si inférieur</td></tr>
        <tr><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;font-weight:600;">Caution</td><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">900 € préautorisée — libérée en l'absence de frais supplémentaires</td></tr>
        <tr><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;font-weight:600;">Conducteurs autorisés</td><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">Uniquement les conducteurs déclarés lors de la réservation (permis ≥ 2 ans)</td></tr>
        <tr><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;font-weight:600;">Zone de circulation</td><td style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">Sud-Est France, Suisse (cantons autorisés), Italie (Piémont, Val d'Aoste) — toute sortie déchoit la garantie</td></tr>
        <tr><td style="padding:5px 8px;font-size:12px;color:#374151;font-weight:600;">Assurance</td><td style="padding:5px 8px;font-size:12px;color:#374151;">AXA FRANCE IARD via courtier AON — police flotte n° 11029669304</td></tr>
      </table>
      <p style="font-size:12px;color:#374151;line-height:1.7;margin:0 0 10px;">
        Les Conditions Générales d'Utilisation complètes sont consultables à tout moment à l'adresse : <a href="https://www.shipcars.fr/cgu" style="color:#4dd4c8;">https://www.shipcars.fr/cgu</a>
      </p>
    </div>

    <!-- Clause tiers payeur (si applicable) -->
    ${res.tiers_payeur_nom ? `
    <div style="background:#fefce8;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-top:12px;">
      <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">⚖️ Clause de solidarité financière — Tiers payeur</div>
      <p style="font-size:12px;color:#374151;line-height:1.7;margin:0 0 8px;">
        <strong>${res.tiers_payeur_nom}</strong> (${res.tiers_payeur_email || '—'}${res.tiers_payeur_telephone ? ` · ${res.tiers_payeur_telephone}` : ''})
        a réglé la présente location et s'engage solidairement avec le conducteur
        <strong>${res.locataire_nom}</strong> au paiement de toutes sommes dues à SHIP CARS au titre de cette location,
        incluant la caution (900 €), les frais kilométriques supplémentaires (0,40 €/km), les frais de carburant,
        de nettoyage, les franchises en cas de sinistre et toute amende résultant d'une infraction.
        ${res.tiers_payeur_consent_at
          ? `<br><strong style="color:#065f46;">Consentement enregistré le ${new Date(res.tiers_payeur_consent_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} — IP : ${res.tiers_payeur_consent_ip || '—'}</strong>`
          : '<br><span style="color:#dc2626;font-weight:700;">⚠️ Consentement électronique en attente de validation par le tiers payeur.</span>'
        }
      </p>
      ${(res as any).tiers_payeur_piece_id_url || (res as any).tiers_payeur_selfie_id_url ? `
      <div style="font-size:11px;color:#92400e;font-weight:600;margin-top:4px;">📷 Documents tiers payeur :</div>
      <table cellpadding="0" cellspacing="0"><tbody>
        ${(res as any).tiers_payeur_piece_id_url ? `<tr><td style="padding:3px 0;font-size:12px;color:#374151;">Pièce d'identité :</td><td style="padding:3px 8px;"><a href="${(res as any).tiers_payeur_piece_id_url}" style="color:#2563eb;">Voir</a></td></tr>` : ''}
        ${(res as any).tiers_payeur_selfie_id_url ? `<tr><td style="padding:3px 0;font-size:12px;color:#374151;">Selfie + pièce :</td><td style="padding:3px 8px;"><a href="${(res as any).tiers_payeur_selfie_id_url}" style="color:#2563eb;">Voir</a></td></tr>` : ''}
      </tbody></table>` : ''}
    </div>` : ''}

    <!-- Clause d'acceptation légale -->
    <div style="background:#f0fdfb;border:1px solid #6ee7b7;border-radius:8px;padding:14px 16px;margin-top:12px;">
      <p style="font-size:12px;color:#065f46;line-height:1.7;margin:0;font-weight:500;">
        En procédant au paiement de cette réservation, le Locataire identifié ci-dessus déclare avoir pris connaissance des Conditions Générales d'Utilisation de SHIP CARS et les accepte sans réserve dans leur intégralité. La validation du paiement en ligne vaut acceptation pleine et entière du présent contrat de location et des CGU applicables, conformément aux articles 1125 et suivants du Code civil relatifs à la formation des contrats par voie électronique.
      </p>
    </div>

    <p style="font-size:10px;color:#9ca3af;line-height:1.6;border-top:1px solid #e8eaf0;padding-top:12px;margin-top:14px;">
      Les informations fournies par le locataire sont susceptibles d'être vérifiées. SHIP CARS se réserve le droit de corriger toute inexactitude constatée. Ce document constitue le contrat de location liant SHIP CARS (SIRET 95083648600015) et le locataire identifié ci-dessus.
    </p>
  </div>`;
}

function cautionUrl(reservationId: string): string {
  return `${BASE_URL}/api/stripe/caution?reservation_id=${reservationId}`;
}

function tenantEmailHtml(contractHtml: string): string {
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
  // Log initial — visible dans Vercel Functions → Logs pour confirmer que le webhook est appelé
  console.log('🔔 Webhook Stripe reçu à', new Date().toISOString(),
    request.headers.get('stripe-signature') ? '✅ signature présente' : '❌ SANS signature');

  // Stripe valide la signature sur les bytes bruts — arrayBuffer évite toute
  // transformation d'encodage ou de fins de ligne que text() pourrait introduire.
  const rawBody  = await request.arrayBuffer();
  const body     = Buffer.from(rawBody);
  const sig      = request.headers.get('stripe-signature') ?? '';
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET ?? '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erreur Signature Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // ── Caution (pré-autorisation) ──
    if (session.metadata?.type === 'caution') {
      const resId = session.metadata?.reservation_id;
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as any)?.id ?? null;
      console.log(`✅ Caution autorisée — résa: ${resId} — PI: ${paymentIntentId}`);
      if (resId) {
        await supabase
          .from('reservations')
          .update({ stripe_caution_id: paymentIntentId, caution_statut: 'autorisee' })
          .eq('id', resId);
      }
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // ── Paiement de location ──
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

      // 2. Caution automatique — pré-autorisation off-session avec la carte enregistrée
      try {
        const piId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as any)?.id;
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : null;

        if (piId && customerId) {
          const pi = await stripe.paymentIntents.retrieve(piId);
          const pmId = typeof pi.payment_method === 'string' ? pi.payment_method : null;

          if (pmId) {
            const cautionPI = await stripe.paymentIntents.create({
              amount: 90000,
              currency: 'eur',
              customer: customerId,
              payment_method: pmId,
              capture_method: 'manual',
              confirm: true,
              off_session: true,
              description: 'Caution de location — Ship Cars',
              metadata: { type: 'caution', reservation_id: reservationId },
            });

            if (cautionPI.status === 'requires_capture') {
              await supabase
                .from('reservations')
                .update({ stripe_caution_id: cautionPI.id, caution_statut: 'autorisee' })
                .eq('id', reservationId);
              console.log(`✅ Caution auto-enregistrée — PI: ${cautionPI.id}`);
            } else {
              console.warn(`⚠️ Caution PI statut inattendu: ${cautionPI.status}`);
            }
          }
        } else {
          console.warn(`⚠️ Caution auto impossible — piId: ${piId}, customerId: ${customerId}`);
        }
      } catch (cautionErr: any) {
        // 3DS requis ou carte refusée → le client recevra le lien dans l'email
        console.warn(`⚠️ Caution off-session échouée (3DS ou refus): ${cautionErr.message}`);
      }

      // 3. Blocage Getaround après paiement confirmé
      const { data: resForBlock } = await supabase
        .from('reservations')
        .select('date_debut, date_fin, vehicules(getaround_id)')
        .eq('id', reservationId)
        .single();

      if (resForBlock) {
        const gaId = (resForBlock.vehicules as any)?.getaround_id;
        const gaApiKey = import.meta.env.GETAROUND_API_KEY ?? '';
        if (!gaApiKey) {
          console.error('❌ [Getaround] GETAROUND_API_KEY absent — impossible de bloquer les dates !');
        }
        if (gaId != null && gaId !== '' && gaId !== 0) {
          try {
            // Garantit un format ISO complet — si date sans heure (DATE col), force minuit Paris (UTC+2)
            const ensureISO = (d: string) => {
              if (!d) return d;
              if (d.includes('T')) return d;          // déjà TIMESTAMPTZ → garder tel quel
              return d + 'T00:00:00+02:00';            // DATE seule → minuit Paris
            };
            const startISO = ensureISO(resForBlock.date_debut);
            const endISO   = ensureISO(resForBlock.date_fin);
            console.log(`[Getaround] Tentative blocage voiture ${gaId} : ${startISO} → ${endISO} | API key présente: ${!!gaApiKey}`);
            const period = await blockDates(String(gaId), startISO, endISO, 'booked');
            if (period !== null) {
              // period peut être { id, starts_at, ends_at } ou { starts_at, ends_at } (204 sans corps)
              if (period.id) {
                await supabase
                  .from('reservations')
                  .update({ getaround_unavailable_period_id: String(period.id) })
                  .eq('id', reservationId);
              }
              console.log(`✅ Getaround bloqué — voiture ${gaId}, période id=${period.id ?? 'n/a'}`);
            } else {
              console.error(`❌ Getaround a refusé le blocage — voiture ${gaId}, dates: ${startISO} → ${endISO}. Vérifiez GETAROUND_API_KEY et getaround_id du véhicule.`);
            }
          } catch (err) {
            console.error('❌ Erreur technique Getaround blockDates:', err);
          }
        } else {
          console.warn(`⚠️ [Getaround] getaround_id manquant ou nul pour véhicule de la résa ${reservationId} — blocage ignoré`);
        }
      }

      // 4. Récupération de la réservation complète avec le véhicule
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
        const pdfFilename  = `contrat-SC-${contractNum}.pdf`;

        // Génération du PDF contrat (import dynamique — ne bloque pas le webhook si pdfkit échoue)
        let pdfBuffer: Buffer | null = null;
        try {
          const { generateContractPdf } = await import('../../../lib/generate-contract-pdf');
          pdfBuffer = await generateContractPdf(res, veh);
          console.log(`✅ PDF contrat généré (${pdfBuffer!.length} bytes)`);
        } catch (err) {
          console.error('❌ Erreur génération PDF (non bloquant):', err);
        }

        const pdfAttachment = pdfBuffer
          ? [{ filename: pdfFilename, content: pdfBuffer.toString('base64') }]
          : [];

        // Téléchargement des photos de permis pour pièces jointes
        const permisAttachments: { filename: string; content: string }[] = [];
        const permisPhotoMap = [
          { url: res.permis_recto_url,  filename: `permis-recto-SC-${contractNum}.jpg`  },
          { url: res.permis_verso_url,  filename: `permis-verso-SC-${contractNum}.jpg`  },
          { url: res.permis_selfie_url, filename: `permis-selfie-SC-${contractNum}.jpg` },
        ];
        for (const { url, filename } of permisPhotoMap) {
          if (!url) continue;
          try {
            const imgRes = await fetch(url);
            if (imgRes.ok) {
              const buf = await imgRes.arrayBuffer();
              // Détecter le type réel à partir du Content-Type ou de l'URL
              const ct = imgRes.headers.get('content-type') || 'image/jpeg';
              const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
              permisAttachments.push({
                filename: filename.replace('.jpg', `.${ext}`),
                content:  Buffer.from(buf).toString('base64'),
              });
            } else {
              console.warn(`⚠️ Photo permis inaccessible (${imgRes.status}) : ${url}`);
            }
          } catch (imgErr) {
            console.error(`❌ Erreur téléchargement photo permis : ${url}`, imgErr);
          }
        }
        console.log(`📎 ${permisAttachments.length}/3 photo(s) de permis jointe(s)`);

        // 4a. Email au locataire (contrat PDF uniquement — pas les photos de son propre permis)
        if (emailClient) {
          try {
            await resend.emails.send({
              from: `Ship Cars <${FROM_EMAIL}>`,
              to: emailClient,
              subject: `Votre contrat de location Ship Cars — N° SC-${contractNum}`,
              html: tenantEmailHtml(contractHtml),
              attachments: pdfAttachment,
            });
            console.log(`✅ Contrat + PDF envoyés au locataire : ${emailClient}`);
          } catch (err) {
            console.error('❌ Erreur email locataire:', err);
          }
        }

        // 4b. Email au propriétaire (contrat PDF + photos du permis)
        try {
          await resend.emails.send({
            from: `Ship Cars <${FROM_EMAIL}>`,
            to: OWNER_EMAIL,
            subject: `[Nouvelle résa] ${res.locataire_nom || emailClient || 'Client'} — SC-${contractNum}`,
            html: ownerEmailHtml(contractHtml, res),
            attachments: [...pdfAttachment, ...permisAttachments],
          });
          console.log(`✅ Contrat PDF + ${permisAttachments.length} photo(s) permis envoyés au propriétaire : ${OWNER_EMAIL}`);
        } catch (err) {
          console.error('❌ Erreur email propriétaire:', err);
        }

        // 4c. Email de consentement au tiers payeur (si présent)
        if (res.tiers_payeur_email && res.tiers_payeur_consent_token) {
          try {
            const consentUrl = `${BASE_URL}/tiers-consent/${res.tiers_payeur_consent_token}`;
            const tiersNom   = res.tiers_payeur_nom || 'Madame, Monsieur';
            await resend.emails.send({
              from: `Ship Cars <${FROM_EMAIL}>`,
              to: res.tiers_payeur_email,
              subject: `⚠️ Action requise — Confirmation de votre accord de paiement · Ship Cars`,
              html: `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:32px auto;padding:0 16px;">
  <div style="background:#0f1e33;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
    <div style="font-size:24px;font-weight:800;color:#fff;">Ship<span style="color:#4dd4c8;">Cars</span></div>
    <div style="font-size:13px;color:#a0b0c0;margin-top:4px;">Confirmation requise — Tiers payeur</div>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px 32px;border:1px solid #e8eaf0;border-top:none;">
    <p style="font-size:15px;color:#1f2937;margin-bottom:8px;">Bonjour ${tiersNom},</p>
    <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:20px;">
      Un paiement de <strong>${Number(res.montant_total).toFixed(2)} €</strong> a été effectué sur votre carte bancaire pour une location de véhicule Ship Cars au nom de <strong>${res.locataire_nom || 'votre mandataire'}</strong> :
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaf0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;width:40%;">Conducteur</td><td style="padding:10px 14px;font-size:13px;color:#1f2937;font-weight:600;border-bottom:1px solid #f3f4f6;">${res.locataire_nom || '—'}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Départ</td><td style="padding:10px 14px;font-size:13px;color:#1f2937;font-weight:600;border-bottom:1px solid #f3f4f6;">${fmt(res.date_debut)}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Retour</td><td style="padding:10px 14px;font-size:13px;color:#1f2937;font-weight:600;border-bottom:1px solid #f3f4f6;">${fmt(res.date_fin)}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;">Montant payé</td><td style="padding:10px 14px;font-size:13px;color:#1f2937;font-weight:700;">${Number(res.montant_total).toFixed(2)} €</td></tr>
    </table>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;">
        <strong>⚠️ En tant que titulaire de la carte bancaire ayant servi à ce paiement, vous êtes solidairement responsable</strong> avec le conducteur de toutes les sommes dues à Ship Cars au titre de cette location : caution (900 €), frais kilométriques supplémentaires (0,40 €/km), frais de carburant, nettoyage, amendes et franchises en cas de sinistre.
      </p>
    </div>
    <p style="font-size:14px;color:#374151;margin-bottom:20px;">Pour confirmer votre accord et accéder à votre exemplaire du contrat, cliquez sur le bouton ci-dessous. <strong>Sans confirmation de votre part, Ship Cars se réserve le droit de refuser la mise à disposition du véhicule.</strong></p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${consentUrl}" style="background:#4dd4c8;color:#0a1421;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block;">✅ Je confirme mon accord</a>
    </div>
    <p style="font-size:12px;color:#9ca3af;line-height:1.6;border-top:1px solid #f3f4f6;padding-top:12px;">
      Si vous n'avez pas autorisé ce paiement ou si vous pensez être victime d'une utilisation frauduleuse de votre carte, <strong>contactez-nous immédiatement</strong> au 06 61 69 11 78 ou à bill.shipcars@gmail.com — et votre banque pour opposition carte.
    </p>
  </div>
</div>
</body>
</html>`,
            });
            console.log(`✅ Email consentement tiers payeur envoyé : ${res.tiers_payeur_email}`);
          } catch (err) {
            console.error('❌ Erreur email tiers payeur:', err);
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
