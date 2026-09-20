-- ============================================================
-- Migration : photos de dommages préexistants, 3 → 8 emplacements
-- Déjà appliquée sur la base de production (idempotente : sans risque de la rejouer).
-- ============================================================
ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS dommages_url_4 text,
  ADD COLUMN IF NOT EXISTS dommages_url_5 text,
  ADD COLUMN IF NOT EXISTS dommages_url_6 text,
  ADD COLUMN IF NOT EXISTS dommages_url_7 text,
  ADD COLUMN IF NOT EXISTS dommages_url_8 text;
