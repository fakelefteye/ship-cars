-- ============================================================
-- Migration : synchronisation calendrier Getaround ↔ Site
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- 1. Colonne pour stocker l'id de la période Getaround sur les réservations
--    (nécessaire pour débloquer Getaround lors d'une annulation)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS getaround_unavailable_period_id TEXT;

-- 2. Table indisponibilites (crée si elle n'existe pas encore)
CREATE TABLE IF NOT EXISTS indisponibilites (
  id                              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicule_id                     UUID REFERENCES vehicules(id) ON DELETE CASCADE,
  date_debut                      TIMESTAMPTZ NOT NULL,
  date_fin                        TIMESTAMPTZ NOT NULL,
  source                          TEXT NOT NULL DEFAULT 'manual', -- 'getaround' | 'manual'
  getaround_rental_id             TEXT,            -- id de la location Getaround
  getaround_unavailable_period_id TEXT,            -- id de la période créée sur Getaround (pour déblocage)
  note                            TEXT,
  created_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- Si la table existait déjà, ajoute les colonnes manquantes
ALTER TABLE indisponibilites
  ADD COLUMN IF NOT EXISTS getaround_rental_id             TEXT,
  ADD COLUMN IF NOT EXISTS getaround_unavailable_period_id TEXT,
  ADD COLUMN IF NOT EXISTS source                          TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS note                            TEXT;

-- 3. Contrainte d'unicité sur getaround_rental_id (pour l'upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'indisponibilites_getaround_rental_id_key'
  ) THEN
    ALTER TABLE indisponibilites
      ADD CONSTRAINT indisponibilites_getaround_rental_id_key
      UNIQUE (getaround_rental_id);
  END IF;
END $$;

-- 4. Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_indisponibilites_vehicule_id
  ON indisponibilites (vehicule_id);

CREATE INDEX IF NOT EXISTS idx_indisponibilites_getaround_rental_id
  ON indisponibilites (getaround_rental_id);

-- 5. RLS : autoriser la lecture/écriture depuis le service role (déjà en place normalement)
ALTER TABLE indisponibilites ENABLE ROW LEVEL SECURITY;

-- Politique : service role peut tout faire (utilisé par les API routes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'indisponibilites' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON indisponibilites
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
