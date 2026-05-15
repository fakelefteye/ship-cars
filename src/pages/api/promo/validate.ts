export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code, date_debut, date_fin } = await request.json();
    const cleaned = (code || '').toString().trim().toUpperCase();

    if (!cleaned) {
      return json({ valid: false, reason: 'Code vide' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('codes_promo')
      .select('code, pourcentage, actif, date_debut_validite, date_fin_validite, prix_fixe_override, jours_avant_max, km_inclus_override')
      .eq('code', cleaned)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ valid: false, reason: 'Code inconnu' });
    if (!data.actif) return json({ valid: false, reason: 'Code désactivé' });

    const check = checkDateWindow(data.date_debut_validite, data.date_fin_validite, date_debut, date_fin);
    if (!check.ok) return json({ valid: false, reason: check.reason });

    // Check jours_avant_max : la location doit démarrer dans les X prochains jours
    if (data.jours_avant_max !== null && data.jours_avant_max !== undefined && date_debut) {
      const startDate = new Date(date_debut);
      const now = new Date();
      const diffDays = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > data.jours_avant_max) {
        return json({ valid: false, reason: `Ce code est valable uniquement pour les locations démarrant dans les ${data.jours_avant_max} prochains jours` });
      }
    }

    return json({
      valid: true,
      code: data.code,
      pourcentage: Number(data.pourcentage),
      prix_fixe_override: data.prix_fixe_override !== null ? Number(data.prix_fixe_override) : null,
      jours_avant_max: data.jours_avant_max !== null ? Number(data.jours_avant_max) : null,
      km_inclus_override: data.km_inclus_override !== null ? Number(data.km_inclus_override) : null,
    });
  } catch (err: any) {
    return json({ valid: false, reason: err.message || 'Erreur serveur' }, 500);
  }
};

export function checkDateWindow(
  validFrom: string | null,
  validTo: string | null,
  rentalStart: string | undefined | null,
  rentalEnd: string | undefined | null
): { ok: true } | { ok: false; reason: string } {
  if (!validFrom && !validTo) return { ok: true };
  if (!rentalStart || !rentalEnd) {
    return { ok: false, reason: 'Ce code est valable sur certaines dates — sélectionnez vos dates d\'abord' };
  }

  const rStart = toDate(rentalStart);
  const rEnd = toDate(rentalEnd);
  if (!rStart || !rEnd) return { ok: false, reason: 'Dates de location invalides' };

  if (validFrom) {
    const vf = toDate(validFrom);
    if (vf && rStart < vf) {
      return { ok: false, reason: `Code valable à partir du ${fmt(vf)}` };
    }
  }
  if (validTo) {
    const vt = toDate(validTo);
    if (vt) {
      // date seule = fin de journée incluse
      vt.setHours(23, 59, 59, 999);
      if (rEnd > vt) return { ok: false, reason: `Code valable jusqu'au ${fmt(vt)}` };
    }
  }
  return { ok: true };
}

function toDate(v: string): Date | null {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function fmt(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
