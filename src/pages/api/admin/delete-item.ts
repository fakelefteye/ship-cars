// src/pages/api/admin/delete-item.ts
export const prerender = false; // Désactive le rendu statique pour permettre le POST

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Vérification de l'authentification
    const cookieHeader = request.headers.get('cookie') || '';
    const isAuthenticated = cookieHeader.split(';').some(cookie =>
      cookie.trim().startsWith('admin_auth=true')
    );
    if (!isAuthenticated) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    const { type, id } = await request.json();

    if (!type || !id) {
      return new Response(JSON.stringify({ error: 'Type et ID requis' }), { status: 400 });
    }

    let error;
    if (type === 'vehicule') {
      // Supprimer d'abord toutes les entrées liées via foreign key
      const { error: resError } = await supabaseAdmin
        .from('reservations')
        .delete()
        .eq('vehicule_id', id);
      if (resError) throw resError;

      // Supprimer aussi les indisponibilités (sync Getaround, etc.)
      const { error: indispoError } = await supabaseAdmin
        .from('indisponibilites')
        .delete()
        .eq('vehicule_id', id);
      // Ne pas throw si la table n'existe pas ou que la ligne n'a rien
      if (indispoError && !indispoError.message?.includes('does not exist')) {
        console.warn('Indisponibilites delete warning:', indispoError.message);
      }

      ({ error } = await supabaseAdmin.from('vehicules').delete().eq('id', id));
    } else if (type === 'accessoire') {
      ({ error } = await supabaseAdmin.from('options_location').delete().eq('id', id));
    } else {
      return new Response(JSON.stringify({ error: 'Type invalide' }), { status: 400 });
    }

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error: any) {
    console.error("Erreur API Delete-Item:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};