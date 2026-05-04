-- ============================================================
-- Migration : tarification dynamique + règles de location
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- 1. Règles de location par véhicule
CREATE TABLE IF NOT EXISTS regles_location (
  id                           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicule_id                  UUID REFERENCES vehicules(id) ON DELETE CASCADE UNIQUE,
  duree_min_heures             INT  DEFAULT 24,   -- durée minimale en heures (24 = 1 jour)
  duree_max_jours              INT,               -- null = pas de limite
  delai_reservation_heures     INT  DEFAULT 0,    -- préavis minimum avant le départ
  plage_disponibilite_jours    INT  DEFAULT 90,   -- horizon de réservation (jours)
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tarifs dynamiques (prix par période)
CREATE TABLE IF NOT EXISTS tarifs_dynamiques (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicule_id      UUID REFERENCES vehicules(id) ON DELETE CASCADE,
  date_debut       DATE NOT NULL,
  date_fin         DATE NOT NULL,
  prix_journalier  DECIMAL(10,2) NOT NULL,
  label            TEXT,
  couleur          TEXT DEFAULT '#c9a84c',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_regles_vehicule_id    ON regles_location(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_tarifs_vehicule_id    ON tarifs_dynamiques(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_tarifs_dates          ON tarifs_dynamiques(date_debut, date_fin);

-- RLS
ALTER TABLE regles_location   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifs_dynamiques ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='regles_location'   AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON regles_location   FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tarifs_dynamiques' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON tarifs_dynamiques FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
