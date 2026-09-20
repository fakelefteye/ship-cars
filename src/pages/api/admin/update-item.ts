// src/pages/api/admin/update-item.ts
export const prerender = false; // Désactive le rendu statique pour permettre le POST

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { DAMAGE_PHOTO_SLOTS } from '../../../lib/damage-photos';

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
        getaround_id:    formData.get('getaround_id'),
        immatriculation: formData.get('immatriculation'),
        description:     formData.get('description'),
        description_en:  formData.get('description_en'),
        description_es:  formData.get('description_es'),
        description_it:  formData.get('description_it'),
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
      // Seuls les champs présents dans la requête sont modifiés. Sinon une sauvegarde partielle
      // (une photo de dommage, le kilométrage…) écrasait modele/annee/prix/images par null : la
      // colonne modele étant NOT NULL, la base refusait toute la mise à jour.
      // Le formulaire complet (formData) envoie toujours toutes ces clés : son comportement est inchangé.
      const updatePayload: Record<string, any> = {};
      if ('nom' in data && data.nom != null) updatePayload.nom = data.nom.toString();
      if ('modele' in data) updatePayload.modele = data.modele?.toString() || null;
      if ('annee' in data) updatePayload.annee = data.annee ? parseInt(data.annee as string) : null;
      if ('prix' in data) updatePayload.prix_journalier_base = data.prix ? parseFloat(data.prix as string) : 0;
      for (const key of ['image_url', 'image_url_2', 'image_url_3', 'image_url_4', 'image_url_5']) {
        // null = champ absent du formulaire (image_url_4/5 n'y figurent pas) : on n'y touche pas
        if (key in data && data[key] !== null) updatePayload[key] = data[key]?.toString() || null;
      }
      if ('getaround_id' in data) {
        updatePayload.getaround_id = data.getaround_id?.toString() || null;
      }
      if ('immatriculation' in data) {
        updatePayload.immatriculation = data.immatriculation?.toString().toUpperCase() || null;
      }
      if ('description' in data) {
        updatePayload.description = data.description?.toString() || null;
      }
      if ('description_en' in data) {
        updatePayload.description_en = data.description_en?.toString() || null;
      }
      if ('description_es' in data) {
        updatePayload.description_es = data.description_es?.toString() || null;
      }
      if ('description_it' in data) {
        updatePayload.description_it = data.description_it?.toString() || null;
      }
      if ('carburant' in data) {
        updatePayload.carburant = data.carburant?.toString() || null;
      }
      if ('kilometrage_depart' in data) {
        updatePayload.kilometrage_depart = data.kilometrage_depart !== null && data.kilometrage_depart !== undefined && data.kilometrage_depart !== ''
          ? parseInt(data.kilometrage_depart as string)
          : null;
      }
      if ('carburant_depart' in data) {
        updatePayload.carburant_depart = data.carburant_depart?.toString() || null;
      }
      if ('carburant_depart_pct' in data) {
        const pct = data.carburant_depart_pct !== null && data.carburant_depart_pct !== undefined && data.carburant_depart_pct !== ''
          ? parseInt(data.carburant_depart_pct as string)
          : null;
        updatePayload.carburant_depart_pct = pct;
        // Sync texte lisible pour rétrocompat
        if (pct !== null) {
          updatePayload.carburant_depart = pct >= 100 ? 'Plein' : pct >= 75 ? '3/4' : pct >= 50 ? '1/2' : pct >= 25 ? '1/4' : 'Vide';
        }
      }
      if ('reservoir_litres' in data) {
        updatePayload.reservoir_litres = data.reservoir_litres !== null && data.reservoir_litres !== undefined && data.reservoir_litres !== ''
          ? parseInt(data.reservoir_litres as string)
          : null;
      }
      for (let n = 1; n <= DAMAGE_PHOTO_SLOTS; n++) {
        const key = `dommages_url_${n}`;
        if (key in data) updatePayload[key] = data[key]?.toString() || null;
      }

      for (const key of ['instructions_prise_en_charge', 'instructions_restitution']) {
        if (key in data) {
          const value = (data[key] ?? '').toString().trim();
          if (value.length > 5000) {
            return new Response(JSON.stringify({ error: 'Texte trop long (5 000 caractères maximum)' }), { status: 400 });
          }
          updatePayload[key] = value || null;
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        return new Response(JSON.stringify({ error: 'Aucune donnée à mettre à jour' }), { status: 400 });
      }
      const { error } = await supabaseAdmin.from('vehicules').update(updatePayload).eq('id', id);

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