// src/pages/api/admin/export-contacts-csv.ts
// GET /api/admin/export-contacts-csv
// Exporte en CSV les locataires ayant accepté les offres commerciales.
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase } from '../../../lib/supabase';

function isAdmin(req: Request) {
  return (req.headers.get('cookie') || '').includes('admin_auth=true');
}

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response('Non autorisé', { status: 401 });
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('locataire_nom, email_client, locataire_adresse, created_at, statut')
    .eq('accepte_offres_commerciales', true)
    .not('email_client', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const rows = data ?? [];
  const headers = ['Nom', 'Email', 'Adresse', 'Date inscription', 'Statut résa'];
  const csvLines = [
    headers.join(','),
    ...rows.map(r => [
      escapeCsv(r.locataire_nom),
      escapeCsv(r.email_client),
      escapeCsv(r.locataire_adresse),
      escapeCsv(r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''),
      escapeCsv(r.statut),
    ].join(',')),
  ];

  const csv = '﻿' + csvLines.join('\r\n'); // BOM UTF-8 pour Excel
  const filename = `contacts-marketing-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
