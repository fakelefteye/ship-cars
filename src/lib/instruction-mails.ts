// src/lib/instruction-mails.ts
// E-mails d'instructions envoyés au locataire, avec le texte saisi par l'admin pour chaque véhicule :
//   - prise en charge : juste après la confirmation de la réservation (paiement)
//   - restitution     : 12 h avant la fin de la location (déclenché par /api/cron/return-reminders)
//
// Un envoi n'est jamais fait deux fois : on « réserve » la réservation en posant l'horodatage
// (mail_prise_en_charge_at / mail_restitution_at) AVANT d'envoyer, et on le retire si l'envoi échoue.

export type MailLang = 'fr' | 'en' | 'es' | 'it';
export type InstructionKind = 'pickup' | 'return';

const LOCALES: Record<MailLang, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT' };

const TEXTS: Record<MailLang, {
  hello: (name?: string | null) => string;
  pickup: { subject: (v: string, n: string) => string; title: string; intro: string };
  ret: { subject: (v: string, n: string) => string; title: string; intro: string };
  vehicle: string; start: string; end: string; bye: string; team: string;
}> = {
  fr: {
    hello: (n) => (n ? `Bonjour ${n},` : 'Bonjour,'),
    pickup: { subject: (v, n) => `Instructions de prise en charge — ${v} · SC-${n}`, title: 'Instructions de prise en charge', intro: 'Votre réservation est confirmée. Voici comment récupérer votre véhicule.' },
    ret:    { subject: (v, n) => `Restitution de votre véhicule — ${v} · SC-${n}`, title: 'Instructions de restitution', intro: 'La fin de votre location approche. Voici comment restituer le véhicule.' },
    vehicle: 'Véhicule', start: 'Début de la location', end: 'Fin de la location',
    bye: 'À bientôt sur la route,', team: "L'équipe Ship Cars",
  },
  en: {
    hello: (n) => (n ? `Hello ${n},` : 'Hello,'),
    pickup: { subject: (v, n) => `Pick-up instructions — ${v} · SC-${n}`, title: 'Pick-up instructions', intro: 'Your booking is confirmed. Here is how to collect your vehicle.' },
    ret:    { subject: (v, n) => `Returning your vehicle — ${v} · SC-${n}`, title: 'Return instructions', intro: 'Your rental is almost over. Here is how to return the vehicle.' },
    vehicle: 'Vehicle', start: 'Rental start', end: 'Rental end',
    bye: 'See you on the road,', team: 'The Ship Cars team',
  },
  es: {
    hello: (n) => (n ? `Hola ${n},` : 'Hola,'),
    pickup: { subject: (v, n) => `Instrucciones de recogida — ${v} · SC-${n}`, title: 'Instrucciones de recogida', intro: 'Tu reserva está confirmada. Así puedes recoger tu vehículo.' },
    ret:    { subject: (v, n) => `Devolución de tu vehículo — ${v} · SC-${n}`, title: 'Instrucciones de devolución', intro: 'Tu alquiler está a punto de terminar. Así debes devolver el vehículo.' },
    vehicle: 'Vehículo', start: 'Inicio del alquiler', end: 'Fin del alquiler',
    bye: '¡Hasta pronto en la carretera!', team: 'El equipo de Ship Cars',
  },
  it: {
    hello: (n) => (n ? `Buongiorno ${n},` : 'Buongiorno,'),
    pickup: { subject: (v, n) => `Istruzioni per il ritiro — ${v} · SC-${n}`, title: 'Istruzioni per il ritiro', intro: 'La tua prenotazione è confermata. Ecco come ritirare il veicolo.' },
    ret:    { subject: (v, n) => `Restituzione del veicolo — ${v} · SC-${n}`, title: 'Istruzioni per la restituzione', intro: 'Il noleggio sta per terminare. Ecco come restituire il veicolo.' },
    vehicle: 'Veicolo', start: 'Inizio del noleggio', end: 'Fine del noleggio',
    bye: 'A presto in strada,', team: 'Il team Ship Cars',
  },
};

export function normalizeLang(lang: unknown): MailLang {
  return lang === 'en' || lang === 'es' || lang === 'it' ? lang : 'fr';
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Texte saisi par l'admin → HTML : échappé, liens http(s) cliquables, retours à la ligne conservés. */
export function instructionsToHtml(text: string): string {
  return escapeHtml(text.trim())
    .replace(/https?:\/\/[^\s<]+/g, (m) => {
      let url = m;
      let tail = '';
      // les entités (guillemets…) et la ponctuation finale ne font pas partie du lien
      const cut = url.search(/&quot;|&#39;|&lt;|&gt;/);
      if (cut >= 0) { tail = url.slice(cut); url = url.slice(0, cut); }
      const punct = url.match(/[.,;:!?)\]]+$/);
      if (punct) { tail = punct[0] + tail; url = url.slice(0, url.length - punct[0].length); }
      return `<a href="${url}" style="color:#0d9488;word-break:break-all;">${url}</a>${tail}`;
    })
    .replace(/\r?\n/g, '<br>');
}

function fmtDate(iso: string | null | undefined, lang: MailLang): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(LOCALES[lang], {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
}

export interface InstructionEmailInput {
  lang?: unknown;
  vehicule: string;
  contractNum: string;
  start?: string | null;
  end?: string | null;
  name?: string | null;
  text: string;
  logoUrl?: string;
}

export function buildInstructionEmail(kind: InstructionKind, p: InstructionEmailInput): { subject: string; html: string } {
  const lang = normalizeLang(p.lang);
  const t = TEXTS[lang];
  const block = kind === 'pickup' ? t.pickup : t.ret;
  const brand = p.logoUrl
    ? `<img src="${escapeHtml(p.logoUrl)}" alt="Ship Cars" style="max-height:44px;display:inline-block;" />`
    : 'Ship<span style="color:#4dd4c8;">Cars</span>';
  const row = (label: string, value: string) => `
        <tr>
          <td style="padding:9px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;width:42%;">${label}</td>
          <td style="padding:9px 12px;font-size:13px;color:#1f2937;font-weight:600;border-bottom:1px solid #f3f4f6;">${escapeHtml(value)}</td>
        </tr>`;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:32px auto;padding:0 16px;">
    <div style="background:#0f1e33;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#ffffff;">${brand}</div>
      <div style="font-size:13px;color:#a0b0c0;margin-top:4px;">${escapeHtml(block.title)}</div>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px 32px;border:1px solid #e8eaf0;border-top:none;">
      <p style="font-size:15px;color:#1f2937;margin:0 0 8px;">${escapeHtml(t.hello(p.name))}</p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px;">${escapeHtml(block.intro)}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaf0;border-radius:8px;margin-bottom:22px;">${row(t.vehicle, p.vehicule)}${row(t.start, fmtDate(p.start, lang))}${row(t.end, fmtDate(p.end, lang))}
      </table>
      <div style="background:#f0fdfb;border-left:4px solid #4dd4c8;border-radius:6px;padding:16px 18px;font-size:14px;color:#1f2937;line-height:1.75;">${instructionsToHtml(p.text)}</div>
      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;">${escapeHtml(t.bye)}<br><strong style="color:#0f1e33;">${escapeHtml(t.team)}</strong></p>
    </div>
  </div>
</body>
</html>`;

  return { subject: block.subject(p.vehicule, p.contractNum), html };
}

export interface MailDeps {
  supabase: any;
  resend: any;
  from: string;
  logoUrl?: string;
}

const contractNumber = (id: string) => String(id).replace(/-/g, '').slice(0, 8).toUpperCase();
const vehiculeLabel = (veh: any) => [veh?.nom, veh?.modele].filter(Boolean).join(' ') || 'Ship Cars';

// Réserve l'envoi (horodatage posé seulement s'il est vide), envoie, et libère la réservation en cas d'échec.
async function claimAndSend(
  deps: MailDeps, reservationId: string, column: 'mail_prise_en_charge_at' | 'mail_restitution_at',
  to: string, mail: { subject: string; html: string },
): Promise<'sent' | 'skipped' | 'failed'> {
  const { data: claimed, error: claimErr } = await deps.supabase
    .from('reservations')
    .update({ [column]: new Date().toISOString() })
    .eq('id', reservationId)
    .is(column, null)
    .select('id');
  if (claimErr) { console.error(`[instruction-mails] réservation ${reservationId} : ${claimErr.message}`); return 'failed'; }
  if (!claimed?.length) return 'skipped'; // déjà envoyé

  const release = () => deps.supabase.from('reservations').update({ [column]: null }).eq('id', reservationId);
  try {
    const { error } = await deps.resend.emails.send({ from: deps.from, to, subject: mail.subject, html: mail.html });
    if (error) throw new Error(typeof error === 'string' ? error : error.message ?? JSON.stringify(error));
    return 'sent';
  } catch (err: any) {
    console.error(`[instruction-mails] envoi échoué (${reservationId}) : ${err?.message ?? err}`);
    await release();
    return 'failed';
  }
}

/** Mail de prise en charge, à envoyer une fois la réservation confirmée. */
export async function sendPickupInstructions(
  deps: MailDeps, res: Record<string, any>, veh: Record<string, any> | null, to: string | null | undefined,
): Promise<'sent' | 'skipped' | 'failed'> {
  const text = String(veh?.instructions_prise_en_charge ?? '').trim();
  if (!text || !to || !res?.id) return 'skipped';
  const mail = buildInstructionEmail('pickup', {
    lang: res.lang, vehicule: vehiculeLabel(veh), contractNum: contractNumber(res.id),
    start: res.date_debut, end: res.date_fin, name: res.locataire_nom, text, logoUrl: deps.logoUrl,
  });
  return claimAndSend(deps, res.id, 'mail_prise_en_charge_at', to, mail);
}

export const RETURN_REMINDER_LEAD_MS = 12 * 60 * 60 * 1000;

/**
 * Mails de restitution : pour chaque location payée qui se termine dans moins de 12 h.
 * Pas avant le début de la location (une location de moins de 12 h reçoit le rappel au départ).
 */
export async function sendReturnReminders(
  deps: MailDeps, now: Date = new Date(),
): Promise<{ checked: number; sent: number; skipped: number; failed: number }> {
  const stats = { checked: 0, sent: 0, skipped: 0, failed: 0 };
  const { data: rows, error } = await deps.supabase
    .from('reservations')
    .select('id, email_client, lang, locataire_nom, date_debut, date_fin, vehicules(nom, modele, instructions_restitution)')
    .in('statut', ['paye', 'confirmee'])
    .is('mail_restitution_at', null)
    .gt('date_fin', now.toISOString())
    .lte('date_fin', new Date(now.getTime() + RETURN_REMINDER_LEAD_MS).toISOString());
  if (error) throw new Error(error.message);

  for (const r of rows ?? []) {
    stats.checked++;
    const veh = Array.isArray(r.vehicules) ? r.vehicules[0] : r.vehicules;
    const text = String(veh?.instructions_restitution ?? '').trim();
    const started = new Date(r.date_debut).getTime() <= now.getTime();
    if (!text || !r.email_client || !started) { stats.skipped++; continue; }

    const mail = buildInstructionEmail('return', {
      lang: r.lang, vehicule: vehiculeLabel(veh), contractNum: contractNumber(r.id),
      start: r.date_debut, end: r.date_fin, name: r.locataire_nom, text, logoUrl: deps.logoUrl,
    });
    stats[await claimAndSend(deps, r.id, 'mail_restitution_at', r.email_client, mail)]++;
  }
  return stats;
}
