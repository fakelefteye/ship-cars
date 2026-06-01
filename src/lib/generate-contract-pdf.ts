// src/lib/generate-contract-pdf.ts
// Génère le contrat de location Ship Cars au format PDF

import PDFDocument from 'pdfkit';

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
}

export async function generateContractPdf(
  res: Record<string, any>,
  veh: Record<string, any> | null
): Promise<Buffer> {
  // Pré-chargement du tampon/signature (si le fichier existe sur le serveur)
  let stampBuffer: Buffer | null = null;
  try {
    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://www.shipcars.fr';
    const r = await fetch(`${baseUrl}/img/tampon-shipcars.jpg`);
    if (r.ok) stampBuffer = Buffer.from(await r.arrayBuffer());
  } catch { /* pas de tampon disponible — on utilise le fallback texte */ }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 45, size: 'A4', info: { Title: 'Contrat de location Ship Cars' } });

    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contractNum = res.id
      ? (res.id as string).replace(/-/g,'').slice(0,8).toUpperCase()
      : '——';
    const diffDays = Math.max(1, Math.ceil(
      (new Date(res.date_fin).getTime() - new Date(res.date_debut).getTime()) / 86400000
    ));
    const kmInclus = diffDays * 100;

    const W   = doc.page.width  - 90;  // largeur utile
    const COL = doc.page.margins.left;

    /* ─── helpers de mise en page ─────────────────────────────────── */
    const COLOR_BLUE   = '#1a3a5c';
    const COLOR_GREY   = '#f2f4f6';
    const COLOR_TEXT   = '#1f2937';
    const COLOR_MUTED  = '#6b7280';
    const COLOR_BORDER = '#d1d5db';

    function sectionHeader(title: string) {
      doc.moveDown(0.5);
      const barY = doc.y;
      doc.rect(COL, barY, W, 18).fill(COLOR_BLUE);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
         .text(title, COL + 6, barY + 4, { width: W - 12, lineBreak: false });
      // Force le curseur sous la barre bleue (évite tout chevauchement)
      doc.y = barY + 22;
      doc.fillColor(COLOR_TEXT);
    }

    function tableRow(label: string, value: string, shade = false) {
      const rowH = 18;
      const labelW = 160;
      if (shade) doc.rect(COL, doc.y, W, rowH).fill(COLOR_GREY);
      doc.rect(COL, doc.y, W, rowH).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
      const y = doc.y + 4;
      doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8)
         .text(label, COL + 4, y, { width: labelW });
      doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(8)
         .text(value || '—', COL + labelW + 4, y, { width: W - labelW - 8 });
      doc.moveDown(rowH / doc.currentLineHeight());
    }

    function bulletLine(text: string) {
      const y = doc.y;
      doc.circle(COL + 4, y + 4, 2).fill(COLOR_BLUE);
      doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(7.5)
         .text(text, COL + 12, y, { width: W - 12 });
    }

    /* ─── EN-TÊTE ─────────────────────────────────────────────────── */
    // Bloc gauche — coordonnées Loueur
    doc.rect(COL, doc.y, W / 2 - 5, 70).fill('#f8fafc').stroke();
    doc.fillColor(COLOR_BLUE).font('Helvetica-Bold').fontSize(14).text('SHIP CARS', COL + 8, doc.y - 65);
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(7.5)
       .text('Location de vehicules de courte duree', COL + 8, doc.y - 5)
       .text('31 rue Pre Megne — 38650 SINARD', COL + 8)
       .text('SIRET : 950 836 486 00015 — RCS Grenoble', COL + 8)
       .text('bill.shipcars@gmail.com — Tel. 07 81 38 13 36', COL + 8);

    // Bloc droit — N° contrat
    const bx = COL + W / 2 + 5;
    doc.rect(bx, doc.y - 65, W / 2 - 5, 70).fill(COLOR_BLUE).stroke();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
       .text('CONTRAT DE LOCATION', bx + 8, doc.y - 60, { width: W / 2 - 20 })
       .text('DE VEHICULE',          bx + 8, undefined,  { width: W / 2 - 20 });
    doc.font('Helvetica').fontSize(8.5)
       .text(`N° SC-${contractNum}`, bx + 8, undefined, { width: W / 2 - 20 })
       .text(`Date : ${fmtDate(new Date().toISOString())}`, bx + 8, undefined, { width: W / 2 - 20 });
    doc.fillColor(COLOR_TEXT).moveDown(0.8);

    /* ─── SECTION 1 — IDENTIFICATION DES PARTIES ──────────────────── */
    sectionHeader('1. Identification des parties');

    // Sous-titre Loueur
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR_BLUE)
       .text('Le Loueur', COL, doc.y).moveDown(0.1);
    let shade = false;
    for (const [l, v] of [
      ['Denomination',       'SHIP CARS — SAS au capital de 1 000 EUR'],
      ['Siege social',       '31 rue Pre Megne — 38650 SINARD'],
      ['SIRET / RCS',        '950 836 486 00015 — RCS Grenoble — APE 77.11A'],
      ['Telephone',          '07 81 38 13 36'],
      ['Courriel',           'bill.shipcars@gmail.com'],
      ['Representant',       'Lise SHIPPAM'],
    ] as [string, string][]) { tableRow(l, v, shade); shade = !shade; }

    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR_BLUE)
       .text('Le Locataire (conducteur principal)', COL, doc.y).moveDown(0.1);
    shade = false;
    for (const [l, v] of [
      ['Nom et prenom',           res.locataire_nom          || ''],
      ['Date de naissance',       fmtDate(res.locataire_date_naissance)],
      ['Lieu de naissance',       res.locataire_lieu_naissance || ''],
      ['Adresse du domicile',     res.locataire_adresse       || ''],
      ['Courriel',                res.email_client            || ''],
      ['N° de permis',       res.locataire_permis_numero || ''],
      ['Date d\'obtention permis', fmtDate(res.locataire_permis_date)],
    ] as [string, string][]) { tableRow(l, v, shade); shade = !shade; }

    // Conducteur secondaire (si renseigné)
    if (res.conducteur2_nom) {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR_BLUE)
         .text('Conducteur secondaire', COL, doc.y).moveDown(0.1);
      shade = false;
      for (const [l, v] of [
        ['Nom et prenom',           res.conducteur2_nom          || ''],
        ['Date de naissance',       fmtDate(res.conducteur2_naissance)],
        ['Lieu de naissance',       res.conducteur2_lieu_naissance || ''],
        ['N° de permis',       res.conducteur2_permis_numero || ''],
        ['Date d\'obtention permis', fmtDate(res.conducteur2_permis_date)],
      ] as [string, string][]) { tableRow(l, v, shade); shade = !shade; }
    }

    /* ─── SECTION 2 — VEHICULE & CONDITIONS ──────────────────────── */
    sectionHeader('2. Vehicule loue et conditions de la location');
    shade = false;
    for (const [l, v] of [
      ['Marque / Modele',          veh ? `${veh.nom}${veh.modele ? ' — ' + veh.modele : ''}` : ''],
      ['Immatriculation',          veh?.immatriculation || ''],
      ['Annee',                    veh?.annee ? String(veh.annee) : ''],
      ['Carburant',                'Sans plomb 95 ou Sans plomb 98'],
      ['Date / heure de debut',    fmtDateTime(res.date_debut)],
      ['Date / heure de fin',      fmtDateTime(res.date_fin)],
      ['Lieu de mise a disposition','62 rue Felix Esclangon 38000 Grenoble'],
      ['Lieu de restitution',      'Identique au lieu de mise a disposition'],
      ['Kilometrage inclus',       `${kmInclus} km (puis 0,40 EUR TTC / km supplementaire)`],
      ['Prix total de la location', `${Number(res.montant_total).toFixed(2)} EUR (hors carburant)`],
      ['Caution / depot de garantie', '900 EUR'],
      ['Franchise applicable',     '1 300 EUR — voir article 6.2'],
    ] as [string, string][]) { tableRow(l, v, shade); shade = !shade; }

    /* ─── SECTION 3 — ZONE GEOGRAPHIQUE (résumé) ──────────────────── */
    sectionHeader('3. Zone geographique de circulation autorisee');
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR_TEXT);
    doc.text(
      'La circulation est autorisee dans les zones suivantes uniquement. Toute sortie constitue une violation du contrat et entraine la decheance de l\'assurance.',
      COL, doc.y, { width: W }
    ).moveDown(0.3);

    const zones = [
      'France — Dept. 01, 04, 05, 06, 07, 11, 13, 26, 30, 34, 38, 42, 66, 69, 73, 74, 83, 84',
      'Suisse — Cantons de Geneve, Vaud, Valais, Fribourg (sud)',
      'Italie — Piemont (Turin) et Vallee d\'Aoste (integralite)',
    ];
    for (const z of zones) bulletLine(z);

    doc.moveDown(0.3);
    doc.font('Helvetica-Oblique').fontSize(7).fillColor('#dc2626')
       .text(
         'Toute circulation hors zone, meme temporaire, requiert un accord ecrit prealable du Loueur. A defaut, l\'assurance ne couvrira ni les dommages ni les recours de tiers.',
         COL, doc.y, { width: W }
       );

    /* ─── SECTION 6 — FRANCHISES (résumé) ────────────────────────── */
    sectionHeader('6. Assurance — Franchises (resume)');
    const franchises: [string, string][] = [
      ['Police AXA',             'n° 11029669304 — Adhesion n° 9070640 / GE00551698N'],
      ['Formule',                'Tous Risques'],
      ['Dommages tous accidents', '1 300 EUR'],
      ['Vol / tentative de vol', '1 300 EUR'],
      ['Bris de glace',          '1 300 EUR'],
      ['Vol — cles dans vehicule', '3 000 EUR'],
    ];
    shade = false;
    for (const [l, v] of franchises) { tableRow(l, v, shade); shade = !shade; }

    /* ─── SECTION 7 — FRAIS COMPLEMENTAIRES (résumé) ─────────────── */
    sectionHeader('7. Frais complementaires eventuels');
    const frais: [string, string][] = [
      ['Kilometrage supp.',       '0,40 EUR TTC / km'],
      ['Carburant manquant',      '0,60 EUR / litre + ajustement prix reel'],
      ['Retard restitution',      '15 EUR / heure entamee (30 min de tolerance)'],
      ['Caractere non-fumeur',    '30 EUR'],
      ['Conducteur non declare',  '500 EUR + decheance assurance'],
      ['Frais gestion sinistre',  '40 EUR'],
    ];
    shade = false;
    for (const [l, v] of frais) { tableRow(l, v, shade); shade = !shade; }

    /* ─── ACCEPTATION & TAMPON ────────────────────────────────────── */
    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(7.5).fillColor('#065f46')
       .text(
         `En procedant au paiement de cette reservation le ${fmtDate(new Date().toISOString())}, le Locataire declare avoir pris connaissance des CGU de SHIP CARS et les accepte sans reserve. La validation du paiement en ligne vaut acceptation pleine et entiere du present contrat, conformement aux articles 1125 et suivants du Code civil.`,
         COL, doc.y, { width: W }
       ).moveDown(0.6);

    // Tampon/signature Loueur
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_BLUE)
       .text('Pour SHIP CARS — Le Loueur', COL, doc.y).moveDown(0.4);

    if (stampBuffer) {
      doc.image(stampBuffer, COL, doc.y, { width: 160, height: 80, fit: [160, 80] });
      doc.moveDown(5.5);
    } else {
      // Fallback si le fichier n'a pas encore été uploadé
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLOR_MUTED)
         .text('Lise SHIPPAM — SHIP CARS', COL, doc.y)
         .text('SAS au capital de 1 000 EUR — SIRET 950 836 486 00015', COL)
         .text('RCS Grenoble — APE 77.11A', COL);
      doc.moveDown(0.5);
    }

    /* ─── PIED DE PAGE ────────────────────────────────────────────── */
    doc.moveDown(1.5);
    doc.font('Helvetica').fontSize(6.5).fillColor(COLOR_MUTED)
       .text(
         'SHIP CARS — SAS — 31 rue Pre Megne 38650 SINARD — SIRET 950 836 486 00015 — RCS Grenoble — APE 77.11A — bill.shipcars@gmail.com — 07 81 38 13 36',
         COL, doc.y, { width: W, align: 'center' }
       );

    doc.end();
  });
}
