// src/pages/api/admin/upload-config-image.ts
// Upload du logo / tampon de l'agence dans Supabase Storage, puis enregistrement
// de l'URL publique dans app_config (logo_url / tampon_url).
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { setReglage } from '../../../lib/reglages';

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp'];

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  if (!cookies.includes('admin_auth=true')) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') === 'tampon' ? 'tampon' : 'logo';

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Aucun fichier reçu.' }), { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'Image trop volumineuse (max 5 Mo).' }), { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    if (!ALLOWED_EXT.includes(ext)) {
      return new Response(JSON.stringify({ error: 'Format non supporté. Utilisez JPG, PNG ou WebP.' }), { status: 400 });
    }

    // Bucket "permis" — déjà public et configuré ; préfixe config/ pour isoler ces fichiers
    const name = `config/${type}-${Date.now()}.${ext}`;
    const buf = new Uint8Array(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from('permis')
      .upload(name, buf, { contentType: file.type, upsert: true });

    if (error) {
      console.error('❌ Erreur upload Supabase:', error.message);
      return new Response(JSON.stringify({ error: 'Erreur upload : ' + error.message }), { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('permis')
      .getPublicUrl(name);

    await setReglage(type === 'tampon' ? 'tampon_url' : 'logo_url', publicUrl);

    console.log(`✅ ${type} uploadé — ${publicUrl}`);
    return new Response(JSON.stringify({ url: publicUrl }), { status: 200 });

  } catch (err: any) {
    console.error('❌ Erreur upload config:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
