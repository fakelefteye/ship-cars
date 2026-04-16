// src/pages/api/reservations/create.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { vehicule_id, date_debut, date_fin, montant_total, email_client } = body;

    // 1. Récupérer l'ID Getaround du véhicule
    const { data: vehicule, error: vehiculeError } = await supabase
      .from('vehicules')
      .select('getaround_id, nom')
      .eq('id', vehicule_id)
      .single();

    if (vehiculeError || !vehicule) {
      return new Response(JSON.stringify({ error: "Véhicule introuvable dans la base." }), { status: 404 });
    }

    // 2. Enregistrer la réservation dans Supabase
    // On utilise les noms de colonnes vérifiés en SQL
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        vehicule_id,
        date_debut,
        date_fin,
        montant_total: parseFloat(montant_total) || 0,
        email_client: email_client || null, // Évite l'erreur NOT NULL si vide
        statut: 'confirmee'
      })
      .select()
      .single();

    if (resError) {
      console.error("Erreur insertion Supabase:", resError);
      throw resError;
    }

    // 3. APPEL À L'API GETAROUND
    if (vehicule.getaround_id) {
      try {
        const GETAROUND_TOKEN = import.meta.env.GETAROUND_TOKEN;
        
        // Nettoyage des dates pour l'API (ISO String -> YYYY-MM-DD)
        const cleanStart = date_debut.split('T')[0];
        const cleanEnd = date_fin.split('T')[0];

        const response = await fetch(`https://api.getaround.com/owner/v1/cars/${vehicule.getaround_id}/unavailable_periods`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GETAROUND_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            unavailable_period: {
              start_date: cleanStart,
              end_date: cleanEnd
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("L'API Getaround a refusé le blocage:", errorData);
          // On ne bloque pas le client ici, la résa Supabase est faite.
        } else {
          console.log(`Dates bloquées avec succès sur Getaround pour l'ID ${vehicule.getaround_id}`);
        }
      } catch (apiErr) {
        console.error("Erreur technique lors de l'appel Getaround:", apiErr);
      }
    }

    return new Response(JSON.stringify({ success: true, reservation }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Erreur critique reservation/create:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};