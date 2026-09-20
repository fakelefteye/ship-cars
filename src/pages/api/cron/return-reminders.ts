// src/pages/api/cron/return-reminders.ts
// Envoie les e-mails d'instructions de restitution, 12 h avant la fin de chaque location.
// Appelé toutes les 15 minutes par pg_cron (voir supabase/return-reminders-cron.sql).
// Sans risque de doublon : chaque réservation n'est traitée qu'une fois (mail_restitution_at).
export const prerender = false;

import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'crypto';
import { Resend } from 'resend';
import { supabaseAdmin } from '../../../lib/supabase';
import { getReglage } from '../../../lib/reglages';
import { sendReturnReminders } from '../../../lib/instruction-mails';

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function isAuthorized(request: Request): Promise<boolean> {
  if ((request.headers.get('cookie') || '').includes('admin_auth=true')) return true;

  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!bearer) return false;

  // Secret propre à ce planificateur (app_config.cron_secret) ou CRON_SECRET de l'environnement
  const secrets = [import.meta.env.CRON_SECRET ?? '', await getReglage('cron_secret')];
  return secrets.some((s) => s && safeEqual(bearer, s));
}

async function handle(request: Request): Promise<Response> {
  if (!(await isAuthorized(request))) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const from = `Ship Cars <${import.meta.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
    const logoUrl = await getReglage('logo_url');

    const stats = await sendReturnReminders({ supabase: supabaseAdmin, resend, from, logoUrl });
    console.log('[return-reminders]', JSON.stringify(stats));
    return new Response(JSON.stringify({ success: true, ...stats }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[return-reminders] erreur :', err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Erreur inconnue' }), { status: 500 });
  }
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
