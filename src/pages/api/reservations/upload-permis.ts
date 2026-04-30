export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

async function uploadFile(file: File, prefix: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from('permis')
    .upload(name, buf, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('permis')
    .getPublicUrl(name);

  return publicUrl;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const recto  = formData.get('recto')  as File | null;
    const verso  = formData.get('verso')  as File | null;
    const selfie = formData.get('selfie') as File | null;

    if (!recto || !verso || !selfie) {
      return new Response(
        JSON.stringify({ error: 'Les 3 photos sont requises (recto, verso, selfie).' }),
        { status: 400 }
      );
    }

    const files = [['recto', recto], ['verso', verso], ['selfie', selfie]] as const;
    for (const [label, file] of files) {
      if (file.size === 0) {
        return new Response(JSON.stringify({ error: `Photo ${label} vide.` }), { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return new Response(
          JSON.stringify({ error: `Photo ${label} trop volumineuse (max 10 Mo).` }),
          { status: 400 }
        );
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXT.includes(ext)) {
        return new Response(
          JSON.stringify({ error: `Format non supporté pour ${label}. Utilisez JPG, PNG ou WebP.` }),
          { status: 400 }
        );
      }
    }

    const [rectoUrl, versoUrl, selfieUrl] = await Promise.all([
      uploadFile(recto,  'recto'),
      uploadFile(verso,  'verso'),
      uploadFile(selfie, 'selfie'),
    ]);

    return new Response(
      JSON.stringify({ success: true, recto_url: rectoUrl, verso_url: versoUrl, selfie_url: selfieUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erreur upload permis:', error.message);
    return new Response(
      JSON.stringify({ error: 'Erreur upload : ' + error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
