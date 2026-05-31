export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const FROM_EMAIL = import.meta.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const BASE_URL   = import.meta.env.PUBLIC_SITE_URL || 'https://www.shipcars.fr';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const { token } = await request.json();
    if (!token) return json({ error: 'Token manquant' }, 400);

    // Récupérer la réservation via le token
    const { data: res, error: fetchErr } = await supabaseAdmin
      .from('reservations')
      .select('id, tiers_payeur_email, tiers_payeur_nom, tiers_payeur_consent_at, locataire_nom, montant_total, date_debut, date_fin, vehicules(nom, modele)')
      .eq('tiers_payeur_consent_token', token)
      .maybeSingle();

    if (fetchErr || !res) return json({ error: 'Lien invalide ou expiré' }, 404);
    if (res.tiers_payeur_consent_at)  return json({ success: true, already: true });

    // Récupérer l'IP réelle
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || clientAddress
            || 'inconnue';

    // Enregistrer le consentement
    const { error: updateErr } = await supabaseAdmin
      .from('reservations')
      .update({
        tiers_payeur_consent_at: new Date().toISOString(),
        tiers_payeur_consent_ip: ip,
      })
      .eq('tiers_payeur_consent_token', token);

    if (updateErr) throw updateErr;

    // Envoyer une confirmation au tiers payeur
    const tiersNom = res.tiers_payeur_nom || 'Madame, Monsieur';
    const veh = res.vehicules as any;
    const vehiculeNom = veh ? `${veh.nom}${veh.modele ? ` — ${veh.modele}` : ''}` : '—';

    const fmt = (d: string) => d ? new Date(d).toLocaleString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
    }) : '—';

    if (res.tiers_payeur_email) {
      await resend.emails.send({
        from: `Ship Cars <${FROM_EMAIL}>`,
        to: res.tiers_payeur_email,
        subject: `✅ Consentement enregistré — Ship Cars`,
        html: `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:32px auto;padding:0 16px;">
  <div style="background:#0f1e33;border-radius:12px 12px 0 0;padding:20px 28px;text-align:center;">
    <div style="font-size:22px;font-weight:800;color:#fff;">Ship<span style="color:#4dd4c8;">Cars</span></div>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:24px 28px;border:1px solid #e8eaf0;border-top:none;">
    <p style="font-size:15px;color:#065f46;font-weight:700;margin-bottom:8px;">✅ Votre consentement a bien été enregistré</p>
    <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:16px;">
      Bonjour ${tiersNom},<br><br>
      Votre accord en tant que tiers payeur a été enregistré pour la location suivante :
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaf0;border-radius:8px;margin-bottom:16px;">
      <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Véhicule</td><td style="padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid #f3f4f6;">${vehiculeNom}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Conducteur</td><td style="padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid #f3f4f6;">${res.locataire_nom || '—'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Départ</td><td style="padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid #f3f4f6;">${fmt(res.date_debut)}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;">Montant</td><td style="padding:8px 12px;font-size:13px;font-weight:700;">${Number(res.montant_total).toFixed(2)} €</td></tr>
    </table>
    <p style="font-size:12px;color:#9ca3af;line-height:1.6;">
      Cet email constitue la preuve de votre consentement, enregistré le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.
      Les Conditions Générales d'Utilisation complètes sont disponibles sur <a href="${BASE_URL}/cgu" style="color:#4dd4c8;">${BASE_URL}/cgu</a>.
    </p>
  </div>
</div>
</body>
</html>`,
      }).catch(e => console.error('Email confirmation tiers:', e));
    }

    return json({ success: true });
  } catch (err: any) {
    console.error('Erreur confirm tiers consent:', err);
    return json({ error: err.message || 'Erreur serveur' }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
