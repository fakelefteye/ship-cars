// src/pages/api/admin/upload-image.ts
export const prerender = false;

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Aucun fichier fourni' }), { status: 400 });
    }

    // Vérification de l'extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowed.includes(fileExt)) {
      return new Response(
        JSON.stringify({ error: 'Format non supporté. Utilisez JPG, PNG ou WebP.' }),
        { status: 400 }
      );
    }

    // Nom de fichier unique
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // Conversion en buffer pour Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('vehicules')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // URL publique de l'image
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('vehicules')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erreur upload image:', error.message);
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'upload : " + error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
