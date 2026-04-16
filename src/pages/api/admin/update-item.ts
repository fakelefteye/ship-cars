// src/pages/api/admin/update-item.ts
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

    // Extraction des données - support pour JSON et formData
    let data: any = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = {
        type: formData.get('type'),
        id: formData.get('id'),
        nom: formData.get('nom'),
        modele: formData.get('modele'),
        annee: formData.get('annee'),
        prix: formData.get('prix'),
        image_url: formData.get('image_url'),
        image_url_2: formData.get('image_url_2'),
        image_url_3: formData.get('image_url_3'),
        image_url_4: formData.get('image_url_4'),
        image_url_5: formData.get('image_url_5'),
        stock: formData.get('stock'),
        stock_total: formData.get('stock_total') // Pour les mises à jour JSON
      };
    }

    const { type, id } = data;

    if (!type || !id) {
      return new Response(JSON.stringify({ error: 'Type et ID requis' }), { status: 400 });
    }

    // Traitement selon le type
    if (type === 'vehicule') {
      const { error } = await supabaseAdmin.from('vehicules').update({
        nom: data.nom?.toString(),
        modele: data.modele?.toString() || null,
        annee: data.annee ? parseInt(data.annee as string) : null,
        prix_journalier_base: data.prix ? parseFloat(data.prix as string) : 0,
        image_url: data.image_url?.toString() || null,
        image_url_2: data.image_url_2?.toString() || null,
        image_url_3: data.image_url_3?.toString() || null,
        image_url_4: data.image_url_4?.toString() || null,
        image_url_5: data.image_url_5?.toString() || null,
      }).eq('id', id);

      if (error) throw error;

    } else if (type === 'accessoire') {
      const updateData: any = {};

      if (data.nom !== undefined && data.nom !== null && data.nom !== '') {
        updateData.nom = data.nom.toString();
      }
      if (data.prix !== undefined && data.prix !== null && data.prix !== '') {
        updateData.prix_fixe = parseFloat(data.prix as string);
      }

      // Utiliser stock_total si fourni (pour les mises à jour JSON), sinon stock
      const stockValue = data.stock_total !== undefined ? data.stock_total : data.stock;
      if (stockValue !== undefined && stockValue !== null && stockValue !== '') {
        updateData.stock_total = parseInt(stockValue as string);
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: 'Aucune donnée à mettre à jour' }), { status: 400 });
      }

      const { error } = await supabaseAdmin.from('options_location').update(updateData).eq('id', id);

      if (error) throw error;
    } else {
      return new Response(JSON.stringify({ error: 'Type invalide' }), { status: 400 });
    }

    // Succès : Redirection vers l'admin
    return redirect('/admin?updated=true', 303);

  } catch (error: any) {
    console.error("Erreur API Update-Item:", error.message);
    return new Response(JSON.stringify({ error: "Erreur lors de la mise à jour : " + error.message }), { status: 500 });
  }
};