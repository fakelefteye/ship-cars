export type Lang = 'fr' | 'en' | 'es' | 'it';

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

// Returns the path for a given language from a base path (no lang prefix)
export function langPath(lang: Lang, basePath = ''): string {
  const p = basePath || '/';
  return lang === 'fr' ? p : `/${lang}${p === '/' ? '' : p}`;
}

// Strip language prefix from a URL path
export function stripLang(path: string): string {
  return path.replace(/^\/(en|es|it)(\/|$)/, '/') || '/';
}

// Detect lang from URL path
export function detectLang(path: string): Lang {
  if (path.startsWith('/en')) return 'en';
  if (path.startsWith('/es')) return 'es';
  if (path.startsWith('/it')) return 'it';
  return 'fr';
}

// ─── NAVIGATION & LAYOUT ────────────────────────────────────────────────────

export const nav = {
  fr: {
    blog: 'Blog',
    faq: 'FAQ',
    tagline: 'Grenoble · Proche gare',
    book: 'Réserver',
  },
  en: {
    blog: 'Blog',
    faq: 'FAQ',
    tagline: 'Grenoble · Near the station',
    book: 'Book',
  },
  es: {
    blog: 'Blog',
    faq: 'FAQ',
    tagline: 'Grenoble · Cerca de la estación',
    book: 'Reservar',
  },
  it: {
    blog: 'Blog',
    faq: 'FAQ',
    tagline: 'Grenoble · Vicino alla stazione',
    book: 'Prenota',
  },
} satisfies Record<Lang, object>;

export const footer = {
  fr: {
    links: [
      { label: 'Location Grenoble', href: '/location-voiture-grenoble' },
      { label: 'Gare de Grenoble', href: '/location-voiture-gare-grenoble' },
      { label: 'Tarifs', href: '/location-voiture-pas-cher-grenoble' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Zones', href: '/zones' },
      { label: 'CGU', href: '/cgu' },
      { label: 'Confidentialité', href: '/confidentialite' },
    ],
    info: '© 2026 Ship Cars · Grenoble, proche de la gare',
    stripe: 'Paiement sécurisé via Stripe · Caution par empreinte bancaire',
  },
  en: {
    links: [
      { label: 'Car rental Grenoble', href: '/en/location-voiture-grenoble' },
      { label: 'Grenoble train station', href: '/en/location-voiture-gare-grenoble' },
      { label: 'Rates', href: '/en/location-voiture-pas-cher-grenoble' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/en/faq' },
      { label: 'Coverage zones', href: '/zones' },
      { label: 'T&Cs', href: '/cgu' },
      { label: 'Privacy', href: '/confidentialite' },
    ],
    info: '© 2026 Ship Cars · Grenoble, near the train station',
    stripe: 'Secure payment via Stripe · Deposit by bank pre-authorisation',
  },
  es: {
    links: [
      { label: 'Alquiler Grenoble', href: '/es/location-voiture-grenoble' },
      { label: 'Estación de Grenoble', href: '/es/location-voiture-gare-grenoble' },
      { label: 'Precios', href: '/es/location-voiture-pas-cher-grenoble' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/es/faq' },
      { label: 'Zonas', href: '/zones' },
      { label: 'T&C', href: '/cgu' },
      { label: 'Privacidad', href: '/confidentialite' },
    ],
    info: '© 2026 Ship Cars · Grenoble, cerca de la estación',
    stripe: 'Pago seguro con Stripe · Depósito por preautorización bancaria',
  },
  it: {
    links: [
      { label: 'Noleggio Grenoble', href: '/it/location-voiture-grenoble' },
      { label: 'Stazione di Grenoble', href: '/it/location-voiture-gare-grenoble' },
      { label: 'Tariffe', href: '/it/location-voiture-pas-cher-grenoble' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/it/faq' },
      { label: 'Zone', href: '/zones' },
      { label: 'T&C', href: '/cgu' },
      { label: 'Privacy', href: '/confidentialite' },
    ],
    info: '© 2026 Ship Cars · Grenoble, vicino alla stazione',
    stripe: 'Pagamento sicuro con Stripe · Deposito in pre-autorizzazione bancaria',
  },
} satisfies Record<Lang, object>;

// ─── HOME PAGE ───────────────────────────────────────────────────────────────

export const home = {
  fr: {
    meta: {
      title: 'Ship Cars — Location de véhicules à Grenoble',
      desc: 'Louez une voiture à Grenoble sans guichet, sans attente. Réservation en ligne, ouverture à distance. À 5 min de la gare.',
    },
    maintenance: {
      title: 'Site en maintenance',
      msg: 'Pour les disponibilités, appelez ou envoyez un message WhatsApp au',
      wa: 'WhatsApp',
    },
    hero: {
      badge: 'Agence en ligne · Grenoble, proche de la gare',
      title: 'Location de voiture',
      subtitle: 'sans guichet, sans attente',
      address: '62 rue Félix Esclangon, 38000 Grenoble',
      addressSub: '— à 5 min à pied de la gare.',
      desc: 'Réservez en ligne, payez par Stripe, <strong>ouvrez votre voiture depuis votre téléphone</strong>. Zéro guichet, zéro file d\'attente.',
      step1: 'Réservez en ligne',
      step2: 'Payez par carte',
      step3: '🔓 Ouvrez à distance',
      cta: 'Voir les véhicules disponibles',
      stat1: '5 min',
      stat1sub: 'de la gare',
      stat2: '0',
      stat2sub: 'guichet · 0 attente',
      stat3: '📱',
      stat3sub: 'ouverture à distance',
    },
    flash: {
      badge: '⚡ Offre limitée',
      title: 'Mardi Flash',
      desc: '25 € la journée · 50 km inclus · Valable uniquement pour un départ dans les 3 prochains jours',
      codeLabel: 'Code promo',
      btn: 'En profiter →',
    },
    lastMinute: {
      badge: '🕐 Dernière minute',
      title: 'Prix Dernière Minute',
      desc: '25 € la journée · 50 km inclus · Départ sous 48 h · En semaine uniquement (lun–ven)',
      codeLabel: 'Code promo',
      btn: 'En profiter →',
    },
    catalogue: {
      label: 'Flotte disponible',
      title: 'Nos véhicules',
      sub: 'Tous nos véhicules sont vérifiés, assurés et entretenus. Caution par empreinte bancaire uniquement.',
      chip1: '62 rue Félix Esclangon, 38000 Grenoble',
      chip2: 'Agence 100% en ligne · Pas de boutique physique',
      chip3: 'Zone limitée Sud-Est & pays frontaliers.',
      chip3link: 'Voir les zones →',
      dateStart: 'Départ',
      dateEnd: 'Retour',
      datePick: 'Choisir une date',
      clear: '✕ Effacer',
      empty: 'Aucun véhicule disponible pour le moment.',
      emptySub: 'Revenez bientôt ou contactez-nous directement.',
    },
    why: {
      title1: 'À 5 min de la gare',
      desc1: '62 rue Félix Esclangon, Grenoble. Récupérez votre voiture rapidement après votre descente du train.',
      title2: 'Paiement sécurisé',
      desc2: 'Stripe gère votre paiement et la caution par empreinte bancaire. Aucune somme bloquée.',
      title3: 'Ouverture à distance',
      desc3: 'Pas de clé à récupérer en main propre. Votre véhicule s\'ouvre depuis votre téléphone — à l\'heure exacte de votre réservation.',
      title4: 'Véhicules vérifiés',
      desc4: 'Tous nos véhicules sont contrôlés, assurés et entretenus régulièrement pour votre sécurité.',
    },
  },

  en: {
    meta: {
      title: 'Ship Cars — Car rental in Grenoble',
      desc: 'Rent a car in Grenoble with no desk, no waiting. Book online, unlock remotely. 5 min from the station.',
    },
    maintenance: {
      title: 'Site under maintenance',
      msg: 'For availability, call or send a WhatsApp message to',
      wa: 'WhatsApp',
    },
    hero: {
      badge: 'Online agency · Grenoble, near the train station',
      title: 'Car rental',
      subtitle: 'no desk, no waiting',
      address: '62 rue Félix Esclangon, 38000 Grenoble',
      addressSub: '— 5 min walk from the train station.',
      desc: 'Book online, pay with Stripe, <strong>unlock your car from your phone</strong>. No desk, no queue.',
      step1: 'Book online',
      step2: 'Pay by card',
      step3: '🔓 Unlock remotely',
      cta: 'See available vehicles',
      stat1: '5 min',
      stat1sub: 'from the station',
      stat2: '0',
      stat2sub: 'desk · 0 waiting',
      stat3: '📱',
      stat3sub: 'remote unlock',
    },
    flash: {
      badge: '⚡ Limited offer',
      title: 'Flash Tuesday',
      desc: '€25/day · 50 km included · Valid only for departures within the next 3 days',
      codeLabel: 'Promo code',
      btn: 'Grab the deal →',
    },
    lastMinute: {
      badge: '🕐 Last minute',
      title: 'Last Minute Price',
      desc: '€25/day · 50 km included · Departure within 48 h · Weekdays only (Mon–Fri)',
      codeLabel: 'Promo code',
      btn: 'Grab the deal →',
    },
    catalogue: {
      label: 'Available fleet',
      title: 'Our vehicles',
      sub: 'All our vehicles are inspected, insured and regularly maintained. Deposit by bank pre-authorisation only.',
      chip1: '62 rue Félix Esclangon, 38000 Grenoble',
      chip2: '100% online agency · No physical branch',
      chip3: 'Limited zone: South-East France & neighbouring countries.',
      chip3link: 'See zones →',
      dateStart: 'Pickup',
      dateEnd: 'Return',
      datePick: 'Choose a date',
      clear: '✕ Clear',
      empty: 'No vehicles available at the moment.',
      emptySub: 'Check back soon or contact us directly.',
    },
    why: {
      title1: '5 min from the station',
      desc1: '62 rue Félix Esclangon, Grenoble. Pick up your car quickly after stepping off the train.',
      title2: 'Secure payment',
      desc2: 'Stripe handles your payment and the deposit by bank pre-authorisation. Nothing actually charged upfront.',
      title3: 'Remote unlock',
      desc3: 'No key handover needed. Your car unlocks from your phone — at the exact time of your booking.',
      title4: 'Inspected vehicles',
      desc4: 'All our vehicles are checked, insured and regularly serviced for your safety.',
    },
  },

  es: {
    meta: {
      title: 'Ship Cars — Alquiler de coches en Grenoble',
      desc: 'Alquila un coche en Grenoble sin mostrador ni esperas. Reserva online, apertura remota. A 5 min de la estación.',
    },
    maintenance: {
      title: 'Sitio en mantenimiento',
      msg: 'Para disponibilidades, llama o envía un WhatsApp al',
      wa: 'WhatsApp',
    },
    hero: {
      badge: 'Agencia online · Grenoble, cerca de la estación',
      title: 'Alquiler de coches',
      subtitle: 'sin mostrador, sin esperas',
      address: '62 rue Félix Esclangon, 38000 Grenoble',
      addressSub: '— a 5 min a pie de la estación.',
      desc: 'Reserva online, paga con Stripe, <strong>abre tu coche desde el móvil</strong>. Sin mostrador, sin cola.',
      step1: 'Reserva online',
      step2: 'Paga con tarjeta',
      step3: '🔓 Abre a distancia',
      cta: 'Ver vehículos disponibles',
      stat1: '5 min',
      stat1sub: 'de la estación',
      stat2: '0',
      stat2sub: 'mostrador · 0 espera',
      stat3: '📱',
      stat3sub: 'apertura remota',
    },
    flash: {
      badge: '⚡ Oferta limitada',
      title: 'Flash del Martes',
      desc: '25 €/día · 50 km incluidos · Válido solo para salidas en los próximos 3 días',
      codeLabel: 'Código promo',
      btn: 'Aprovechar →',
    },
    lastMinute: {
      badge: '🕐 Última hora',
      title: 'Precio Última Hora',
      desc: '25 €/día · 50 km incluidos · Salida en menos de 48 h · Solo laborables (lun–vie)',
      codeLabel: 'Código promo',
      btn: 'Aprovechar →',
    },
    catalogue: {
      label: 'Flota disponible',
      title: 'Nuestros vehículos',
      sub: 'Todos nuestros vehículos están revisados, asegurados y mantenidos. Depósito por preautorización bancaria.',
      chip1: '62 rue Félix Esclangon, 38000 Grenoble',
      chip2: 'Agencia 100% online · Sin oficina física',
      chip3: 'Zona limitada: Sureste de Francia y países fronterizos.',
      chip3link: 'Ver zonas →',
      dateStart: 'Salida',
      dateEnd: 'Devolución',
      datePick: 'Elegir fecha',
      clear: '✕ Borrar',
      empty: 'No hay vehículos disponibles en este momento.',
      emptySub: 'Vuelve pronto o contáctanos directamente.',
    },
    why: {
      title1: 'A 5 min de la estación',
      desc1: '62 rue Félix Esclangon, Grenoble. Recoge tu coche rápidamente al bajar del tren.',
      title2: 'Pago seguro',
      desc2: 'Stripe gestiona el pago y la fianza por preautorización bancaria. No se bloquea ningún importe.',
      title3: 'Apertura remota',
      desc3: 'Sin entrega de llaves en persona. Tu coche se abre desde el móvil — a la hora exacta de tu reserva.',
      title4: 'Vehículos revisados',
      desc4: 'Todos nuestros vehículos son inspeccionados, asegurados y mantenidos regularmente para tu seguridad.',
    },
  },

  it: {
    meta: {
      title: 'Ship Cars — Noleggio auto a Grenoble',
      desc: 'Noleggia un\'auto a Grenoble senza sportello né attese. Prenotazione online, apertura remota. A 5 min dalla stazione.',
    },
    maintenance: {
      title: 'Sito in manutenzione',
      msg: 'Per le disponibilità, chiama o invia un messaggio WhatsApp al',
      wa: 'WhatsApp',
    },
    hero: {
      badge: 'Agenzia online · Grenoble, vicino alla stazione',
      title: 'Noleggio auto',
      subtitle: 'senza sportello, senza attese',
      address: '62 rue Félix Esclangon, 38000 Grenoble',
      addressSub: '— a 5 min a piedi dalla stazione.',
      desc: 'Prenota online, paga con Stripe, <strong>apri la tua auto dal telefono</strong>. Zero sportello, zero fila.',
      step1: 'Prenota online',
      step2: 'Paga con carta',
      step3: '🔓 Apri a distanza',
      cta: 'Vedi i veicoli disponibili',
      stat1: '5 min',
      stat1sub: 'dalla stazione',
      stat2: '0',
      stat2sub: 'sportello · 0 attesa',
      stat3: '📱',
      stat3sub: 'apertura remota',
    },
    flash: {
      badge: '⚡ Offerta limitata',
      title: 'Flash del Martedì',
      desc: '25 €/giorno · 50 km inclusi · Valido solo per partenze entro i prossimi 3 giorni',
      codeLabel: 'Codice promo',
      btn: 'Approfitta →',
    },
    lastMinute: {
      badge: '🕐 Ultimo minuto',
      title: 'Prezzo Last Minute',
      desc: '25 €/giorno · 50 km inclusi · Partenza entro 48 h · Solo nei giorni feriali (lun–ven)',
      codeLabel: 'Codice promo',
      btn: 'Approfitta →',
    },
    catalogue: {
      label: 'Flotta disponibile',
      title: 'I nostri veicoli',
      sub: 'Tutti i nostri veicoli sono controllati, assicurati e regolarmente manutenuti. Deposito solo tramite pre-autorizzazione bancaria.',
      chip1: '62 rue Félix Esclangon, 38000 Grenoble',
      chip2: 'Agenzia 100% online · Nessuna sede fisica',
      chip3: 'Zona limitata: Francia meridionale e paesi limitrofi.',
      chip3link: 'Vedi le zone →',
      dateStart: 'Partenza',
      dateEnd: 'Ritorno',
      datePick: 'Scegli una data',
      clear: '✕ Cancella',
      empty: 'Nessun veicolo disponibile al momento.',
      emptySub: 'Torna presto o contattaci direttamente.',
    },
    why: {
      title1: 'A 5 min dalla stazione',
      desc1: '62 rue Félix Esclangon, Grenoble. Ritira la tua auto subito dopo essere sceso dal treno.',
      title2: 'Pagamento sicuro',
      desc2: 'Stripe gestisce il pagamento e il deposito in pre-autorizzazione bancaria. Nessun importo bloccato.',
      title3: 'Apertura remota',
      desc3: 'Nessuna consegna di chiavi di persona. La tua auto si apre dal telefono — all\'ora esatta della tua prenotazione.',
      title4: 'Veicoli controllati',
      desc4: 'Tutti i nostri veicoli sono ispezionati, assicurati e regolarmente manutenuti per la tua sicurezza.',
    },
  },
} satisfies Record<Lang, object>;

// ─── FAQ ─────────────────────────────────────────────────────────────────────

export const faqContent = {
  fr: {
    meta: {
      title: 'FAQ — Questions fréquentes | Ship Cars Grenoble',
      desc: 'Toutes les réponses aux questions sur la location de voiture avec Ship Cars à Grenoble : réservation, tarifs, caution, permis, zones de circulation, prise en charge.',
      canonical: 'https://www.shipcars.fr/faq',
    },
    hero: {
      breadcrumb: 'Accueil',
      title: 'Questions fréquentes',
      subtitle: 'Tout ce que vous devez savoir sur la location de voiture avec Ship Cars à Grenoble',
    },
    cta: {
      book: 'Réserver un véhicule →',
      noAnswer: "Vous n'avez pas trouvé votre réponse ?",
      contact: 'Contactez-nous directement via WhatsApp ou e-mail, nous répondons rapidement.',
      wa: 'WhatsApp — 06 61 69 11 78',
      vehicles: 'Voir les véhicules',
    },
    cats: [
      {
        cat: 'Réservation',
        items: [
          { q: 'Comment réserver un véhicule Ship Cars ?', a: 'La réservation se fait entièrement en ligne sur shipcars.fr. Choisissez votre véhicule, sélectionnez vos dates, renseignez vos informations personnelles et votre permis de conduire, puis payez par carte bancaire sécurisée. Vous recevez une confirmation par e-mail immédiatement.' },
          { q: 'Peut-on annuler ou modifier une réservation ?', a: 'Pour toute demande de modification ou d\'annulation, contactez-nous via WhatsApp au 06 61 69 11 78 ou par e-mail. Les conditions d\'annulation sont précisées dans nos Conditions Générales de Location.' },
          { q: 'Proposez-vous des véhicules 7 places ?', a: 'Pas encore. Notre flotte est actuellement composée de citadines et de berlines. L\'ajout de véhicules 7 places est envisagé prochainement.' },
          { q: 'Puis-je louer un véhicule avec attelage / boule de remorquage ?', a: 'Oui, certains de nos véhicules peuvent être équipés d\'un attelage. Il faut nous prévenir à l\'avance lors de la réservation. Ce service est facturé 50 € en sus du prix de la location.' },
          { q: 'La réservation en ligne est-elle sécurisée ?', a: 'Oui. Les paiements sont traités via Stripe. Vos coordonnées bancaires ne transitent jamais par nos serveurs.' },
          { q: 'Peut-on réserver pour le même jour ?', a: 'Oui, selon les disponibilités. Vérifiez le calendrier sur la fiche du véhicule. En cas d\'urgence, contactez-nous directement sur WhatsApp.' },
        ],
      },
      {
        cat: 'Tarifs & Paiement',
        items: [
          { q: 'Quel est le prix d\'une location de voiture chez Ship Cars ?', a: 'Nos tarifs démarrent à partir de 35 € par jour pour une citadine, 100 km/jour inclus. Le prix varie selon le véhicule, la période et la durée. Les kilomètres supplémentaires sont facturés 0,40 € TTC par km.' },
          { q: 'Que se passe-t-il si je dépasse le kilométrage inclus ?', a: 'Chaque journée inclut 100 km. Les kilomètres supplémentaires sont facturés 0,40 € TTC/km. Le dépassement est constaté automatiquement via le boîtier Connect.' },
          { q: 'Quels modes de paiement sont acceptés ?', a: '<strong>Carte bancaire uniquement</strong> (Visa, Mastercard, American Express) via Stripe. <strong>Les chèques ne sont pas acceptés.</strong> La carte utilisée pour la caution peut être différente de celle ayant servi au paiement.' },
          { q: 'Y a-t-il des frais de carburant ou de nettoyage ?', a: 'Le plein doit être fait au retour. En cas de retour avec le véhicule très sale, des frais de nettoyage peuvent être appliqués.' },
          { q: 'Proposez-vous des réductions ou codes promo ?', a: 'Oui ! Nous proposons régulièrement des offres spéciales, notamment le Mardi Flash. Surveillez notre page d\'accueil.' },
          { q: 'Peut-on payer avec la carte bancaire de quelqu\'un d\'autre ?', a: '<strong>Oui, c\'est tout à fait possible.</strong> Ship Cars accepte qu\'un tiers règle la location. Le titulaire doit fournir sa pièce d\'identité, un selfie et confirmer son accord par e-mail. <a href="/blog/louer-voiture-carte-bancaire-quelquun-dautre" style="color:var(--teal);font-weight:600;">En savoir plus →</a>' },
        ],
      },
      {
        cat: 'Caution',
        items: [
          { q: 'Quel est le montant de la caution ?', a: 'La caution est de 900 €, prise en pré-autorisation bancaire à la prise en charge du véhicule.' },
          { q: 'La caution est-elle débitée sur mon compte ?', a: 'Non. La pré-autorisation réserve la somme sans la débiter réellement. Si vous rendez le véhicule en bon état, elle est levée automatiquement.' },
          { q: 'Quand est levée la pré-autorisation de caution ?', a: 'Dans un délai de 3 à 7 jours ouvrés après le retour du véhicule, selon votre banque.' },
        ],
      },
      {
        cat: 'Permis & Conditions',
        items: [
          { q: 'Quelle ancienneté de permis est requise ?', a: 'Le permis de conduire doit être obtenu depuis au moins 2 ans. Cette règle s\'applique également au conducteur secondaire.' },
          { q: 'Peut-on ajouter un deuxième conducteur ?', a: 'Oui, et c\'est gratuit. Les deux conducteurs doivent satisfaire aux mêmes conditions (permis valide, 2 ans d\'ancienneté).' },
          { q: 'Y a-t-il un âge minimum pour louer ?', a: 'Il n\'y a pas d\'âge minimum au-delà de la possession d\'un permis valide depuis au moins 2 ans.' },
        ],
      },
      {
        cat: 'Zones de circulation',
        items: [
          { q: 'Dans quelles zones puis-je circuler ?', a: 'Nos véhicules sont autorisés en France métropolitaine (Isère, Rhône, Savoie…), en Suisse et en Italie. Consultez notre <a href="/zones" style="color:var(--teal);font-weight:600;">page zones autorisées</a>.' },
          { q: 'Puis-je aller dans les stations de ski ?', a: 'Oui. Pour les routes nécessitant des chaînes ou pneus neige, vérifiez avec nous avant la location.' },
          { q: 'Puis-je traverser la frontière suisse ou italienne ?', a: 'Oui, sous réserve que votre destination soit dans notre zone autorisée. Contactez-nous en cas de doute.' },
        ],
      },
      {
        cat: 'Prise en charge & Retour',
        items: [
          { q: 'Où se situe l\'agence Ship Cars à Grenoble ?', a: 'Notre agence est au 62 rue Félix Esclangon, 38000 Grenoble, à 5 minutes à pied de la gare SNCF.' },
          { q: 'Quels sont les horaires de remise et de retour ?', a: 'Les horaires sont convenus à la réservation selon vos besoins. Notre service est disponible 7j/7.' },
          { q: 'Que se passe-t-il en cas de panne ou d\'accident ?', a: 'Contactez-nous immédiatement au 06 61 69 11 78. En cas d\'accident, établissez un constat amiable et prévenez-nous.' },
        ],
      },
    ],
  },

  en: {
    meta: {
      title: 'FAQ — Frequently Asked Questions | Ship Cars Grenoble',
      desc: 'All your questions about car rental with Ship Cars in Grenoble: booking, rates, deposit, driving licence, zones and pick-up.',
      canonical: 'https://www.shipcars.fr/en/faq',
    },
    hero: {
      breadcrumb: 'Home',
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about renting a car with Ship Cars in Grenoble',
    },
    cta: {
      book: 'Book a vehicle →',
      noAnswer: "Didn't find your answer?",
      contact: 'Contact us directly via WhatsApp or email — we reply quickly.',
      wa: 'WhatsApp — +33 6 61 69 11 78',
      vehicles: 'See vehicles',
    },
    cats: [
      {
        cat: 'Booking',
        items: [
          { q: 'How do I book a Ship Cars vehicle?', a: 'Booking is done entirely online at shipcars.fr. Choose your vehicle, select your dates, fill in your personal details and driving licence, then pay by secure card. You receive a confirmation email immediately.' },
          { q: 'Can I cancel or modify a booking?', a: 'For any modification or cancellation request, contact us via WhatsApp at +33 6 61 69 11 78 or by email. Cancellation terms are detailed in our General Rental Conditions.' },
          { q: 'Do you offer 7-seat vehicles?', a: 'Not yet. Our fleet currently consists of city cars and saloons. 7-seaters are planned for the future.' },
          { q: 'Can I rent a vehicle with a tow hitch?', a: 'Yes, some of our vehicles can be fitted with a tow hitch. Please let us know in advance when booking. This service is charged at €50 in addition to the rental price.' },
          { q: 'Is online booking secure?', a: 'Yes. Payments are processed via Stripe. Your bank details never pass through our servers.' },
          { q: 'Can I book for the same day?', a: 'Yes, subject to availability. Check the availability calendar on the vehicle page. For urgent requests, contact us directly on WhatsApp.' },
        ],
      },
      {
        cat: 'Rates & Payment',
        items: [
          { q: 'What is the price of a car rental with Ship Cars?', a: 'Our rates start from €35/day for a city car, with 100 km/day included. The price varies by vehicle, period and duration. Extra kilometres are charged at €0.40 per km.' },
          { q: 'What happens if I exceed the included mileage?', a: 'Each day includes 100 km. Extra kilometres are charged at €0.40/km ex-VAT. The overage is detected automatically via the Connect box when you return the vehicle.' },
          { q: 'What payment methods are accepted?', a: '<strong>Credit/debit card only</strong> (Visa, Mastercard, American Express) via Stripe. <strong>Cheques are not accepted.</strong> The card used for the deposit may differ from the one used for the rental payment.' },
          { q: 'Are there fuel or cleaning fees?', a: 'The tank must be returned at the same level as at pick-up. If the vehicle is returned very dirty, a cleaning fee may apply.' },
          { q: 'Do you offer discounts or promo codes?', a: 'Yes! We regularly run special offers, including Flash Tuesday. Keep an eye on our home page.' },
          { q: 'Can someone else pay for my rental?', a: '<strong>Yes, absolutely.</strong> Ship Cars accepts third-party payments. The cardholder must provide their ID, a selfie and confirm their agreement by email. <a href="/blog/louer-voiture-carte-bancaire-quelquun-dautre" style="color:var(--teal);font-weight:600;">Learn more →</a>' },
        ],
      },
      {
        cat: 'Deposit',
        items: [
          { q: 'How much is the deposit?', a: 'The deposit is €900, taken as a bank pre-authorisation at vehicle pick-up.' },
          { q: 'Is the deposit actually charged?', a: 'No. The pre-authorisation reserves the amount without actually charging it. If you return the vehicle in good condition, it is released automatically.' },
          { q: 'When is the pre-authorisation released?', a: 'Within 3 to 7 business days after the vehicle is returned, depending on your bank.' },
        ],
      },
      {
        cat: 'Licence & Conditions',
        items: [
          { q: 'How long must I have held my licence?', a: 'Your driving licence must have been held for at least 2 years. This also applies to any additional driver.' },
          { q: 'Can I add a second driver?', a: 'Yes, and it\'s free. Both drivers must meet the same requirements (valid licence, held for 2+ years).' },
          { q: 'Is there a minimum age to rent?', a: 'There is no set minimum age beyond holding a valid driving licence for at least 2 years.' },
        ],
      },
      {
        cat: 'Coverage zones',
        items: [
          { q: 'Where can I drive with a Ship Cars vehicle?', a: 'Our vehicles are authorised in metropolitan France (Isère, Rhône, Savoie…), Switzerland and Italy. Check our <a href="/zones" style="color:var(--teal);font-weight:600;">authorised zones page</a>.' },
          { q: 'Can I drive to ski resorts?', a: 'Yes. For roads requiring snow chains or winter tyres, please check with us before renting.' },
          { q: 'Can I cross the Swiss or Italian border?', a: 'Yes, provided your destination is within our authorised zone. Contact us if in doubt.' },
        ],
      },
      {
        cat: 'Pick-up & Return',
        items: [
          { q: 'Where is the Ship Cars agency in Grenoble?', a: 'Our agency is at 62 rue Félix Esclangon, 38000 Grenoble, 5 minutes\' walk from the SNCF train station.' },
          { q: 'What are the pick-up and return times?', a: 'Times are agreed at booking according to your needs. Our service is available 7 days a week.' },
          { q: 'What happens in case of breakdown or accident?', a: 'Contact us immediately on +33 6 61 69 11 78. In case of accident, fill in an incident report and notify us.' },
        ],
      },
    ],
  },

  es: {
    meta: {
      title: 'FAQ — Preguntas frecuentes | Ship Cars Grenoble',
      desc: 'Todas las respuestas sobre el alquiler de coches con Ship Cars en Grenoble: reserva, tarifas, depósito, carnet, zonas y recogida.',
      canonical: 'https://www.shipcars.fr/es/faq',
    },
    hero: {
      breadcrumb: 'Inicio',
      title: 'Preguntas frecuentes',
      subtitle: 'Todo lo que necesitas saber sobre el alquiler de coches con Ship Cars en Grenoble',
    },
    cta: {
      book: 'Reservar un vehículo →',
      noAnswer: '¿No encontraste tu respuesta?',
      contact: 'Contáctanos directamente por WhatsApp o email — respondemos rápidamente.',
      wa: 'WhatsApp — +33 6 61 69 11 78',
      vehicles: 'Ver vehículos',
    },
    cats: [
      {
        cat: 'Reservas',
        items: [
          { q: '¿Cómo reservar un vehículo Ship Cars?', a: 'La reserva se realiza completamente online en shipcars.fr. Elige tu vehículo, selecciona las fechas, completa tus datos y carnet de conducir, y paga con tarjeta de forma segura. Recibes una confirmación por email inmediatamente.' },
          { q: '¿Se puede cancelar o modificar una reserva?', a: 'Para cualquier modificación o cancelación, contáctanos por WhatsApp al +33 6 61 69 11 78 o por email. Las condiciones de cancelación están detalladas en nuestras Condiciones Generales.' },
          { q: '¿Ofrecéis vehículos de 7 plazas?', a: 'Todavía no. Nuestra flota está compuesta actualmente por coches urbanos y berlinas. Los vehículos de 7 plazas están previstos próximamente.' },
          { q: '¿Puedo alquilar un vehículo con enganche?', a: 'Sí, algunos de nuestros vehículos pueden equiparse con enganche. Debes avisarnos al reservar. Este servicio se factura 50 € adicionales al precio del alquiler.' },
          { q: '¿Es segura la reserva online?', a: 'Sí. Los pagos se procesan a través de Stripe. Tus datos bancarios nunca pasan por nuestros servidores.' },
          { q: '¿Se puede reservar para el mismo día?', a: 'Sí, según disponibilidad. Consulta el calendario en la ficha del vehículo. En caso de urgencia, contáctanos por WhatsApp.' },
        ],
      },
      {
        cat: 'Tarifas y Pago',
        items: [
          { q: '¿Cuál es el precio del alquiler?', a: 'Nuestras tarifas empiezan desde 35 €/día para un urbano, con 100 km/día incluidos. El precio varía según el vehículo, el período y la duración. Los kilómetros extra se cobran a 0,40 € por km.' },
          { q: '¿Qué pasa si supero el kilometraje incluido?', a: 'Cada día incluye 100 km. Los kilómetros extra se cobran a 0,40 €/km IVA incluido, detectados automáticamente por la caja Connect.' },
          { q: '¿Qué métodos de pago se aceptan?', a: '<strong>Solo tarjeta bancaria</strong> (Visa, Mastercard, American Express) a través de Stripe. <strong>No se aceptan cheques.</strong> La tarjeta del depósito puede ser diferente a la del pago del alquiler.' },
          { q: '¿Hay cargos por combustible o limpieza?', a: 'El depósito debe devolverse al mismo nivel que al inicio. Si el vehículo se devuelve muy sucio, se puede aplicar una tarifa de limpieza.' },
          { q: '¿Ofrecéis descuentos o códigos promo?', a: '¡Sí! Ofrecemos regularmente ofertas especiales, incluyendo el Flash del Martes. Consulta nuestra página de inicio.' },
          { q: '¿Puede pagar otra persona por mí?', a: '<strong>Sí, es perfectamente posible.</strong> Ship Cars acepta pagos de terceros. El titular debe proporcionar su DNI, un selfie y confirmar su acuerdo por email. <a href="/blog/louer-voiture-carte-bancaire-quelquun-dautre" style="color:var(--teal);font-weight:600;">Más información →</a>' },
        ],
      },
      {
        cat: 'Depósito',
        items: [
          { q: '¿Cuánto es el depósito?', a: 'El depósito es de 900 €, tomado como preautorización bancaria en la recogida del vehículo.' },
          { q: '¿Se carga el depósito en mi cuenta?', a: 'No. La preautorización reserva el importe sin cargarlo realmente. Si devuelves el vehículo en buen estado, se libera automáticamente.' },
          { q: '¿Cuándo se libera la preautorización?', a: 'En un plazo de 3 a 7 días laborables tras la devolución, según tu banco.' },
        ],
      },
      {
        cat: 'Carnet y Condiciones',
        items: [
          { q: '¿Cuánto tiempo debo llevar con el carnet?', a: 'El carnet de conducir debe tener una antigüedad mínima de 2 años. Esta regla también se aplica al conductor adicional.' },
          { q: '¿Se puede añadir un segundo conductor?', a: 'Sí, y es gratuito. Ambos conductores deben cumplir los mismos requisitos (carnet válido, 2 años de antigüedad mínima).' },
          { q: '¿Hay una edad mínima para alquilar?', a: 'No hay edad mínima más allá de tener un carnet válido con al menos 2 años de antigüedad.' },
        ],
      },
      {
        cat: 'Zonas de circulación',
        items: [
          { q: '¿Dónde puedo circular con un vehículo Ship Cars?', a: 'Nuestros vehículos están autorizados en la Francia metropolitana (Isère, Rhône, Savoie…), Suiza e Italia. Consulta nuestra <a href="/zones" style="color:var(--teal);font-weight:600;">página de zonas autorizadas</a>.' },
          { q: '¿Puedo ir a estaciones de esquí?', a: 'Sí. Para carreteras que requieran cadenas o neumáticos de invierno, consulta con nosotros antes del alquiler.' },
          { q: '¿Puedo cruzar la frontera suiza o italiana?', a: 'Sí, siempre que tu destino esté dentro de nuestra zona autorizada. Contáctanos si tienes dudas.' },
        ],
      },
      {
        cat: 'Recogida y Devolución',
        items: [
          { q: '¿Dónde está la agencia Ship Cars en Grenoble?', a: 'Nuestra agencia está en 62 rue Félix Esclangon, 38000 Grenoble, a 5 minutos a pie de la estación SNCF.' },
          { q: '¿Cuáles son los horarios de recogida y devolución?', a: 'Los horarios se acuerdan en la reserva según tus necesidades. Nuestro servicio está disponible 7 días a la semana.' },
          { q: '¿Qué ocurre en caso de avería o accidente?', a: 'Contáctanos inmediatamente en el +33 6 61 69 11 78. En caso de accidente, cumplimenta un parte amistoso e infórmanos.' },
        ],
      },
    ],
  },

  it: {
    meta: {
      title: 'FAQ — Domande frequenti | Ship Cars Grenoble',
      desc: 'Tutte le risposte sul noleggio auto con Ship Cars a Grenoble: prenotazione, tariffe, deposito, patente, zone e ritiro.',
      canonical: 'https://www.shipcars.fr/it/faq',
    },
    hero: {
      breadcrumb: 'Home',
      title: 'Domande frequenti',
      subtitle: 'Tutto quello che devi sapere sul noleggio auto con Ship Cars a Grenoble',
    },
    cta: {
      book: 'Prenota un veicolo →',
      noAnswer: 'Non hai trovato la tua risposta?',
      contact: 'Contattaci direttamente via WhatsApp o email — rispondiamo rapidamente.',
      wa: 'WhatsApp — +33 6 61 69 11 78',
      vehicles: 'Vedi i veicoli',
    },
    cats: [
      {
        cat: 'Prenotazione',
        items: [
          { q: 'Come prenotare un veicolo Ship Cars?', a: 'La prenotazione si effettua interamente online su shipcars.fr. Scegli il veicolo, seleziona le date, inserisci i tuoi dati personali e la patente, poi paga con carta in modo sicuro. Ricevi una conferma via email immediatamente.' },
          { q: 'Si può cancellare o modificare una prenotazione?', a: 'Per qualsiasi modifica o cancellazione, contattaci via WhatsApp al +33 6 61 69 11 78 o via email. Le condizioni di cancellazione sono dettagliate nelle nostre Condizioni Generali.' },
          { q: 'Offrite veicoli a 7 posti?', a: 'Non ancora. La nostra flotta è attualmente composta da citycar e berlinas. I veicoli a 7 posti sono previsti prossimamente.' },
          { q: 'Posso noleggiare un veicolo con gancio traino?', a: 'Sì, alcuni veicoli possono essere equipaggiati con gancio traino. È necessario avvisarci al momento della prenotazione. Il servizio è fatturato 50 € in aggiunta al prezzo del noleggio.' },
          { q: 'La prenotazione online è sicura?', a: 'Sì. I pagamenti sono gestiti tramite Stripe. I tuoi dati bancari non transitano mai dai nostri server.' },
          { q: 'Si può prenotare per lo stesso giorno?', a: 'Sì, in base alla disponibilità. Controlla il calendario sulla scheda del veicolo. In caso di urgenza, contattaci direttamente su WhatsApp.' },
        ],
      },
      {
        cat: 'Tariffe e Pagamento',
        items: [
          { q: 'Qual è il prezzo del noleggio?', a: 'Le nostre tariffe partono da 35 €/giorno per una citycar, con 100 km/giorno inclusi. Il prezzo varia in base al veicolo, al periodo e alla durata. I chilometri extra vengono addebitati a 0,40 € al km.' },
          { q: 'Cosa succede se supero il chilometraggio incluso?', a: 'Ogni giorno include 100 km. I chilometri extra vengono addebitati a 0,40 €/km IVA inclusa, rilevati automaticamente dal dispositivo Connect alla restituzione.' },
          { q: 'Quali metodi di pagamento sono accettati?', a: '<strong>Solo carta bancaria</strong> (Visa, Mastercard, American Express) tramite Stripe. <strong>I assegni non sono accettati.</strong> La carta utilizzata per il deposito può essere diversa da quella usata per il pagamento.' },
          { q: 'Ci sono costi per carburante o pulizia?', a: 'Il serbatoio deve essere restituito allo stesso livello del ritiro. In caso di restituzione del veicolo molto sporco, potrebbe essere applicato un costo di pulizia.' },
          { q: 'Offrite sconti o codici promo?', a: 'Sì! Proponiamo regolarmente offerte speciali, incluso il Flash del Martedì. Tieni d\'occhio la nostra homepage.' },
          { q: 'Può pagare qualcun altro al mio posto?', a: '<strong>Sì, è assolutamente possibile.</strong> Ship Cars accetta pagamenti di terzi. Il titolare della carta deve fornire un documento d\'identità, un selfie e confermare il suo accordo via email. <a href="/blog/louer-voiture-carte-bancaire-quelquun-dautre" style="color:var(--teal);font-weight:600;">Scopri di più →</a>' },
        ],
      },
      {
        cat: 'Deposito',
        items: [
          { q: 'Qual è l\'importo del deposito?', a: 'Il deposito è di 900 €, preso come pre-autorizzazione bancaria al momento del ritiro del veicolo.' },
          { q: 'Il deposito viene addebitato sul mio conto?', a: 'No. La pre-autorizzazione riserva l\'importo senza addebitarlo realmente. Se restituisci il veicolo in buone condizioni, viene sbloccata automaticamente.' },
          { q: 'Quando viene sbloccata la pre-autorizzazione?', a: 'Entro 3-7 giorni lavorativi dalla restituzione del veicolo, a seconda della tua banca.' },
        ],
      },
      {
        cat: 'Patente e Condizioni',
        items: [
          { q: 'Da quanto tempo devo avere la patente?', a: 'La patente di guida deve essere stata ottenuta da almeno 2 anni. Questa regola si applica anche al conducente aggiuntivo.' },
          { q: 'Si può aggiungere un secondo conducente?', a: 'Sì, ed è gratuito. Entrambi i conducenti devono soddisfare gli stessi requisiti (patente valida, almeno 2 anni).' },
          { q: "C'è un'età minima per noleggiare?", a: "Non c'è un'età minima oltre al possesso di una patente valida da almeno 2 anni." },
        ],
      },
      {
        cat: 'Zone di circolazione',
        items: [
          { q: 'Dove posso guidare con un veicolo Ship Cars?', a: 'I nostri veicoli sono autorizzati in Francia metropolitana (Isère, Rhône, Savoie…), Svizzera e Italia. Consulta la nostra <a href="/zones" style="color:var(--teal);font-weight:600;">pagina zone autorizzate</a>.' },
          { q: 'Posso andare nelle stazioni sciistiche?', a: 'Sì. Per le strade che richiedono catene o pneumatici invernali, verifica con noi prima del noleggio.' },
          { q: 'Posso attraversare il confine svizzero o italiano?', a: 'Sì, a condizione che la tua destinazione rientri nella nostra zona autorizzata. Contattaci in caso di dubbio.' },
        ],
      },
      {
        cat: 'Ritiro e Restituzione',
        items: [
          { q: "Dove si trova l'agenzia Ship Cars a Grenoble?", a: "La nostra agenzia è in 62 rue Félix Esclangon, 38000 Grenoble, a 5 minuti a piedi dalla stazione ferroviaria SNCF." },
          { q: 'Quali sono gli orari di ritiro e restituzione?', a: 'Gli orari vengono concordati alla prenotazione in base alle tue esigenze. Il nostro servizio è disponibile 7 giorni su 7.' },
          { q: 'Cosa succede in caso di guasto o incidente?', a: 'Contattaci immediatamente al +33 6 61 69 11 78. In caso di incidente, compila un modulo di constatazione amichevole e informaci.' },
        ],
      },
    ],
  },
} satisfies Record<Lang, object>;

// ─── VEHICLE PAGE ────────────────────────────────────────────────────────────

export const veh = {
  fr: {
    back: '← Retour au catalogue', from: 'à partir de', perDay: '/ jour',
    included: '100 km/jour inclus dans la location', extraKm: 'Km supplémentaires',
    bookTitle: '📅 Réserver ce véhicule', pickupReturn: 'Départ et retour',
    pickup: 'Départ', return: 'Retour', chooseDate: 'Choisir une date',
    available: 'Disponible', partial: 'Partiellement', occupied: 'Occupé',
    seatTitle: 'Siège auto enfant', seatHint: 'Sélectionnez vos dates pour vérifier la disponibilité',
    promoLabel: 'Code promo (optionnel)', promoApply: 'Appliquer',
    duration: 'Durée', rental: 'Location', seat: 'Siège auto',
    mileage: 'Kilométrage', included2: 'inclus', total: 'Total',
    deposit: 'Caution : 900 € — pré-autorisée', depositNote: 'Aucune somme débitée sur votre compte.',
    depositFaq: "Qu'est-ce qu'une pré-autorisation ?",
    zone: 'Circulation <strong>limitée à certaines zones</strong> (Sud-Est France, Suisse, Italie frontalière).',
    zoneLink: 'Voir les zones autorisées →',
    insuranceTitle: 'Protection complémentaire recommandée',
    insuranceBankNote: 'Vérifiez aussi les garanties de votre carte bancaire (Visa Premier, Mastercard Gold…).',
    bookBtn: 'Réserver maintenant', unavailable: 'Indisponible',
    maintenanceTitle: 'Site en maintenance', maintenanceMsg: 'Pour les disponibilités, appelez ou envoyez un message WhatsApp au',
    errMinDuration: 'Durée minimale de location', errMaxDuration: 'Durée maximale de location',
    errWeekend: 'Les locations incluant un week-end sont de 2 jours minimum.',
    errPeriod: 'Pendant cette période, la durée minimale est de',
    errPeriodMax: 'Pendant cette période, la durée maximale est de',
    errDay: 'jour(s)', errHour: 'heure(s)',
    errConflict: '⚠️ Créneau en conflit avec une réservation existante. Veuillez ajuster vos horaires.',
    promoInvalid: 'Code invalide ou expiré.', promoOk: 'Code appliqué',
    daysAvailable: (n: number) => n === 0 ? 'Aucun véhicule disponible' : `${n} véhicule${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`,
  },
  en: {
    back: '← Back to catalogue', from: 'from', perDay: '/ day',
    included: '100 km/day included in the rental', extraKm: 'Extra km',
    bookTitle: '📅 Book this vehicle', pickupReturn: 'Pickup & Return',
    pickup: 'Pickup', return: 'Return', chooseDate: 'Choose a date',
    available: 'Available', partial: 'Partially', occupied: 'Occupied',
    seatTitle: 'Child car seat', seatHint: 'Select your dates to check availability',
    promoLabel: 'Promo code (optional)', promoApply: 'Apply',
    duration: 'Duration', rental: 'Rental', seat: 'Car seat',
    mileage: 'Mileage', included2: 'included', total: 'Total',
    deposit: 'Deposit: €900 — pre-authorised', depositNote: 'Nothing actually charged to your account.',
    depositFaq: 'What is a pre-authorisation?',
    zone: 'Travel <strong>restricted to certain zones</strong> (South-East France, Switzerland, Northern Italy).',
    zoneLink: 'See authorised zones →',
    insuranceTitle: 'Additional protection recommended',
    insuranceBankNote: 'Also check your bank card coverage (Visa Premier, Mastercard Gold…).',
    bookBtn: 'Book now', unavailable: 'Unavailable',
    maintenanceTitle: 'Site under maintenance', maintenanceMsg: 'For availability, call or send a WhatsApp to',
    errMinDuration: 'Minimum rental duration', errMaxDuration: 'Maximum rental duration',
    errWeekend: 'Rentals including a weekend require a minimum of 2 days.',
    errPeriod: 'During this period, the minimum duration is',
    errPeriodMax: 'During this period, the maximum duration is',
    errDay: 'day(s)', errHour: 'hour(s)',
    errConflict: '⚠️ Slot conflicts with an existing booking. Please adjust your times.',
    promoInvalid: 'Invalid or expired code.', promoOk: 'Code applied',
    daysAvailable: (n: number) => n === 0 ? 'No vehicles available' : `${n} vehicle${n > 1 ? 's' : ''} available`,
  },
  es: {
    back: '← Volver al catálogo', from: 'desde', perDay: '/ día',
    included: '100 km/día incluidos en el alquiler', extraKm: 'Km extra',
    bookTitle: '📅 Reservar este vehículo', pickupReturn: 'Salida y devolución',
    pickup: 'Salida', return: 'Devolución', chooseDate: 'Elegir fecha',
    available: 'Disponible', partial: 'Parcialmente', occupied: 'Ocupado',
    seatTitle: 'Silla infantil para coche', seatHint: 'Selecciona tus fechas para comprobar disponibilidad',
    promoLabel: 'Código promo (opcional)', promoApply: 'Aplicar',
    duration: 'Duración', rental: 'Alquiler', seat: 'Silla infantil',
    mileage: 'Kilometraje', included2: 'incluido', total: 'Total',
    deposit: 'Depósito: 900 € — preautorizado', depositNote: 'No se carga ninguna suma en tu cuenta.',
    depositFaq: '¿Qué es una preautorización?',
    zone: 'Circulación <strong>limitada a ciertas zonas</strong> (Sureste de Francia, Suiza, Italia del norte).',
    zoneLink: 'Ver zonas autorizadas →',
    insuranceTitle: 'Protección adicional recomendada',
    insuranceBankNote: 'Consulta también las coberturas de tu tarjeta bancaria (Visa Premier, Mastercard Gold…).',
    bookBtn: 'Reservar ahora', unavailable: 'No disponible',
    maintenanceTitle: 'Sitio en mantenimiento', maintenanceMsg: 'Para disponibilidades, llama o envía un WhatsApp al',
    errMinDuration: 'Duración mínima de alquiler', errMaxDuration: 'Duración máxima de alquiler',
    errWeekend: 'Los alquileres que incluyan fin de semana requieren un mínimo de 2 días.',
    errPeriod: 'Durante este período, la duración mínima es de',
    errPeriodMax: 'Durante este período, la duración máxima es de',
    errDay: 'día(s)', errHour: 'hora(s)',
    errConflict: '⚠️ El horario entra en conflicto con una reserva existente. Ajusta tus horarios.',
    promoInvalid: 'Código inválido o expirado.', promoOk: 'Código aplicado',
    daysAvailable: (n: number) => n === 0 ? 'No hay vehículos disponibles' : `${n} vehículo${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`,
  },
  it: {
    back: '← Torna al catalogo', from: 'da', perDay: '/ giorno',
    included: '100 km/giorno inclusi nel noleggio', extraKm: 'Km extra',
    bookTitle: '📅 Prenota questo veicolo', pickupReturn: 'Partenza e ritorno',
    pickup: 'Partenza', return: 'Ritorno', chooseDate: 'Scegli una data',
    available: 'Disponibile', partial: 'Parzialmente', occupied: 'Occupato',
    seatTitle: 'Seggiolino auto bambino', seatHint: 'Seleziona le date per verificare la disponibilità',
    promoLabel: 'Codice promo (opzionale)', promoApply: 'Applica',
    duration: 'Durata', rental: 'Noleggio', seat: 'Seggiolino',
    mileage: 'Chilometraggio', included2: 'inclusi', total: 'Totale',
    deposit: 'Deposito: 900 € — pre-autorizzato', depositNote: 'Nessun importo addebitato sul tuo conto.',
    depositFaq: "Cos'è una pre-autorizzazione?",
    zone: 'Circolazione <strong>limitata a certe zone</strong> (Francia meridionale, Svizzera, Italia settentrionale).',
    zoneLink: 'Vedi le zone autorizzate →',
    insuranceTitle: 'Protezione aggiuntiva consigliata',
    insuranceBankNote: 'Verifica anche le garanzie della tua carta bancaria (Visa Premier, Mastercard Gold…).',
    bookBtn: 'Prenota ora', unavailable: 'Non disponibile',
    maintenanceTitle: 'Sito in manutenzione', maintenanceMsg: 'Per disponibilità, chiama o invia un WhatsApp al',
    errMinDuration: 'Durata minima di noleggio', errMaxDuration: 'Durata massima di noleggio',
    errWeekend: 'I noleggi che includono un weekend richiedono un minimo di 2 giorni.',
    errPeriod: 'Durante questo periodo, la durata minima è di',
    errPeriodMax: 'Durante questo periodo, la durata massima è di',
    errDay: 'giorno/i', errHour: 'ora/e',
    errConflict: '⚠️ Il periodo è in conflitto con una prenotazione esistente. Modifica gli orari.',
    promoInvalid: 'Codice non valido o scaduto.', promoOk: 'Codice applicato',
    daysAvailable: (n: number) => n === 0 ? 'Nessun veicolo disponibile' : `${n} veicolo${n > 1 ? 'i' : ''} disponibile${n > 1 ? 'i' : ''}`,
  },
} satisfies Record<Lang, object>;
