// src/pages/api/admin/upload-config-image.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { setReglage } from '../../../lib/reglages';

export const POST: APIRoute = async ({ request }) => {
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  const cookies = request.headers.get('cookie') || '';

  if (!cookies.includes('admin_auth=true') && !adminPassword) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'logo';

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Fichier invalide ou non une image' }), { status: 400 });
    }

    // Uploads le fichier dans Supabase Storage
    const filename = `config-${type}-${Date.now()}.${file.type.split('/')[1]}`;
    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filename, file, { upsert: false });

    if (error) {
      console.error('Erreur upload Supabase:', error);
      return new Response(JSON.stringify({ error: 'Erreur upload' }), { status: 500 });
    }

    // Génère l'URL publique
    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Sauvegarde l'URL dans app_config
    const configKey = type === 'tampon' ? 'tampon_url' : 'logo_url';
    await setReglage(configKey, publicUrl);

    console.log(`✅ ${type} uploadé — URL: ${publicUrl}`);
    return new Response(JSON.stringify({ url: publicUrl }), { status: 200 });

  } catch (err: any) {
    console.error('❌ Erreur upload:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
