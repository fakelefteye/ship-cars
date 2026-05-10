// src/lib/brevo.ts — Synchronisation contacts Brevo (ex Sendinblue)
// Doc API : https://developers.brevo.com/reference/createcontact
//
// Variables d'environnement requises :
//   BREVO_API_KEY    — clé API Brevo (Account > SMTP & API > API Keys)
//   BREVO_LIST_ID    — (optionnel) ID de la liste Brevo où ajouter le contact

import type { GetaroundUser } from './getaround';

const BREVO_API = 'https://api.brevo.com/v3';

function brevoKey(): string {
  return import.meta.env.BREVO_API_KEY ?? '';
}

/**
 * Crée ou met à jour un contact Brevo à partir d'un user Getaround.
 * Utilise l'email en priorité ; si absent, utilise le téléphone comme identifiant.
 * Retourne true si la sync a réussi.
 */
export async function upsertBrevoContact(
  user: GetaroundUser,
  rentalInfo?: { rental_id?: string | number; car_id?: string | number; starts_at?: string; ends_at?: string },
): Promise<boolean> {
  const key = brevoKey();
  if (!key) {
    console.warn('[Brevo] BREVO_API_KEY non configurée — sync ignorée');
    return false;
  }

  // Nettoyage du numéro de téléphone (Brevo veut format E.164 sans espaces)
  const phone = user.phone_number?.replace(/\s/g, '') ?? null;

  // Brevo exige au moins un email OU un numéro SMS
  const email = user.email ?? null;
  if (!email && !phone) {
    console.warn('[Brevo] Pas d\'email ni de téléphone pour user', user.id);
    return false;
  }

  // Attributs Brevo (noms standards du template par défaut)
  const attributes: Record<string, string | number | null> = {
    FIRSTNAME:    user.first_name ?? null,
    LASTNAME:     user.last_name  ?? null,
    SMS:          phone,
    ADDRESS:      [user.address_line1, user.address_line2].filter(Boolean).join(', ') || null,
    ZIPCODE:      user.postal_code ?? null,
    CITY:         user.city        ?? null,
    COUNTRY:      user.country     ?? null,
    DATE_OF_BIRTH: user.birth_date ?? null,
    // Attributs personnalisés — à créer dans Brevo si pas déjà présents
    GA_USER_ID:           String(user.id),
    GA_LICENSE_NUMBER:    user.license_number          ?? null,
    GA_LICENSE_COUNTRY:   user.license_country         ?? null,
    GA_LICENSE_DATE:      user.license_first_issue_date ?? null,
    GA_LAST_RENTAL_ID:    rentalInfo?.rental_id ? String(rentalInfo.rental_id) : null,
    GA_LAST_RENTAL_START: rentalInfo?.starts_at ?? null,
    GA_LAST_RENTAL_END:   rentalInfo?.ends_at   ?? null,
  };

  // Supprimer les attributs null pour ne pas écraser les valeurs existantes
  const cleanAttrs = Object.fromEntries(
    Object.entries(attributes).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );

  const listIdRaw = import.meta.env.BREVO_LIST_ID;
  const listIds   = listIdRaw ? [parseInt(listIdRaw, 10)] : [];

  const body: Record<string, any> = {
    updateEnabled: true,   // met à jour si le contact existe déjà
    attributes:    cleanAttrs,
    ...(listIds.length > 0 ? { listIds } : {}),
  };

  // Identifiant principal : email si dispo, sinon SMS
  if (email) {
    body.email = email;
  } else {
    body.smsBlacklisted = false;
    // Pour créer un contact sans email, Brevo requiert l'attribut SMS dans attributes
    // (déjà inclus ci-dessus) + un email factice n'est pas recommandé.
    // On génère un email basé sur le phone si vraiment pas d'email.
    body.email = `ga-${user.id}@noemail.shipcars.fr`;
  }

  try {
    const res = await fetch(`${BREVO_API}/contacts`, {
      method:  'POST',
      headers: {
        'api-key':      key,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok || res.status === 204) {
      console.log(`[Brevo] Contact synchronisé — user Getaround ${user.id} (${email ?? phone})`);
      return true;
    }

    // 400 "Contact already exist" → considéré comme succès (updateEnabled devrait l'éviter mais par sécurité)
    const json = await res.json().catch(() => ({}));
    if (json?.code === 'duplicate_parameter') {
      console.log(`[Brevo] Contact déjà existant mis à jour — user ${user.id}`);
      return true;
    }

    console.error('[Brevo] Erreur API', res.status, JSON.stringify(json));
    return false;
  } catch (e) {
    console.error('[Brevo] Erreur réseau', e);
    return false;
  }
}
