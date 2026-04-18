export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

function isAuthed(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader
    .split(';')
    .some((c) => c.trim().startsWith('admin_auth=true'));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizeDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Format attendu YYYY-MM-DD ; sinon essai parse
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthed(request)) return json({ error: 'Non autorisé' }, 401);

  const { data, error } = await supabaseAdmin
    .from('codes_promo')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ success: true, items: data || [] });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthed(request)) return json({ error: 'Non autorisé' }, 401);

  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'create') {
      const code = (body.code || '').toString().trim().toUpperCase();
      const pourcentage = Number(body.pourcentage);
      const description = (body.description || '').toString().trim() || null;
      const dateDebut = normalizeDate(body.date_debut_validite);
      const dateFin = normalizeDate(body.date_fin_validite);

      if (!code) return json({ error: 'Code manquant' }, 400);
      if (!(pourcentage > 0 && pourcentage <= 100)) {
        return json({ error: 'Pourcentage invalide (1-100)' }, 400);
      }
      if (dateDebut && dateFin && dateDebut > dateFin) {
        return json({ error: 'La date de début doit être avant la date de fin' }, 400);
      }

      const { data, error } = await supabaseAdmin
        .from('codes_promo')
        .insert({
          code,
          pourcentage,
          actif: true,
          description,
          date_debut_validite: dateDebut,
          date_fin_validite: dateFin,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return json({ error: 'Ce code existe déjà' }, 409);
        return json({ error: error.message }, 500);
      }
      return json({ success: true, item: data });
    }

    if (action === 'toggle') {
      const id = body.id;
      const actif = !!body.actif;
      if (!id) return json({ error: 'ID manquant' }, 400);

      const { error } = await supabaseAdmin
        .from('codes_promo')
        .update({ actif })
        .eq('id', id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === 'delete') {
      const id = body.id;
      if (!id) return json({ error: 'ID manquant' }, 400);

      const { error } = await supabaseAdmin
        .from('codes_promo')
        .delete()
        .eq('id', id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: 'Action inconnue' }, 400);
  } catch (err: any) {
    return json({ error: err.message || 'Erreur serveur' }, 500);
  }
};
