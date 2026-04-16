// src/pages/api/admin/add-item.ts
export const prerender = false; // Désactive le rendu statique pour permettre le POST

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    // Vérification de l'authentification
    const cookieHeader = request.headers.get('cookie') || '';
    const isAuthenticated = cookieHeader.split(';').some(cookie => 
      cookie.trim().startsWith('admin_auth=true')
    );
    if (!isAuthenticated) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    // 1. Vérification du format de la requête
    const contentType = request.headers.get("content-type") || "";
    const isForm = contentType.includes("application/x-www-form-urlencoded") || 
                   contentType.includes("multipart/form-data");

    if (!isForm) {
      return new Response(
        JSON.stringify({ error: "Format de formulaire non valide." }), 
        { status: 400 }
      );
    }

    // 2. Extraction des données
    const formData = await request.formData();
    const type = formData.get('type');
    const nom = formData.get('nom')?.toString();

    if (!nom) {
      return new Response(JSON.stringify({ error: "Le nom est obligatoire." }), { status: 400 });
    }

    // 3. Traitement selon le type (Véhicule vs Accessoire)
    if (type === 'vehicule') {
      const { error } = await supabaseAdmin.from('vehicules').insert({
        nom: nom,
        modele: formData.get('modele')?.toString() || null,
        annee: formData.get('annee') ? parseInt(formData.get('annee') as string) : null,
        prix_journalier_base: formData.get('prix') ? parseFloat(formData.get('prix') as string) : 0,
        image_url: formData.get('image_url')?.toString() || null,
        // Gestion propre des 4 photos supplémentaires
        image_url_2: formData.get('image_url_2')?.toString() || null,
        image_url_3: formData.get('image_url_3')?.toString() || null,
        image_url_4: formData.get('image_url_4')?.toString() || null,
        image_url_5: formData.get('image_url_5')?.toString() || null,
      });

      if (error) throw error;

    } else {
      // Pour les accessoires
      const { error } = await supabaseAdmin.from('options_location').insert({
        nom: nom,
        prix_fixe: formData.get('prix') ? parseFloat(formData.get('prix') as string) : 0,
        stock_total: formData.get('stock') ? parseInt(formData.get('stock') as string) : 0
      });

      if (error) throw error;
    }

    // 4. Succès : Retourner une réponse JSON
    return new Response(
      JSON.stringify({ success: true, message: 'Élément créé avec succès' }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Erreur API Add-Item:", error.message);
    
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'enregistrement : " + error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};