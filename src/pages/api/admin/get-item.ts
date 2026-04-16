// src/pages/api/admin/get-item.ts
export const prerender = false; // Désactive le rendu statique pour permettre le GET

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Vérification de l'authentification
    const cookieHeader = request.headers.get('cookie') || '';
    const isAuthenticated = cookieHeader.split(';').some(cookie => 
      cookie.trim().startsWith('admin_auth=true')
    );
    if (!isAuthenticated) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');

    if (!type || !id) {
      return new Response(JSON.stringify({ error: 'Type et ID requis' }), { status: 400 });
    }

    let data, error;
    if (type === 'vehicule') {
      ({ data, error } = await supabaseAdmin.from('vehicules').select('*').eq('id', id).single());
    } else if (type === 'accessoire') {
      ({ data, error } = await supabaseAdmin.from('options_location').select('*').eq('id', id).single());
    } else {
      return new Response(JSON.stringify({ error: 'Type invalide' }), { status: 400 });
    }

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, item: data }), { status: 200 });

  } catch (error: any) {
    console.error("Erreur API Get-Item:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};