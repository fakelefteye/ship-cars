-- ============================================================
-- Migration : descriptions traduites des véhicules (EN / ES / IT)
-- Déjà appliquée sur la base de production (idempotente : sans risque de la rejouer).
--
-- Le code les lisait et les écrivait déjà (formulaires d'ajout et de modification d'un
-- véhicule, fiche véhicule publique) mais les colonnes n'existaient pas : ajouter ou
-- modifier un véhicule échouait. Vides, la fiche retombe sur la description française.
-- ============================================================
ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_es text,
  ADD COLUMN IF NOT EXISTS description_it text;
