-- ============================================================
-- Migration : instructions de prise en charge / restitution par véhicule
-- Déjà appliquée sur la base de production (idempotente : sans risque de la rejouer).
-- ============================================================

-- Texte saisi dans l'admin, à côté de chaque véhicule
ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS instructions_prise_en_charge text,
  ADD COLUMN IF NOT EXISTS instructions_restitution text;

-- Horodatage d'envoi : garantit qu'un mail n'est jamais envoyé deux fois pour une réservation
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS mail_prise_en_charge_at timestamptz,
  ADD COLUMN IF NOT EXISTS mail_restitution_at timestamptz;

-- Les locations déjà commencées ne reçoivent pas de mail rétroactif
UPDATE public.reservations
   SET mail_prise_en_charge_at = COALESCE(mail_prise_en_charge_at, now()),
       mail_restitution_at     = COALESCE(mail_restitution_at, CASE WHEN date_fin <= now() THEN now() END)
 WHERE date_debut <= now();
