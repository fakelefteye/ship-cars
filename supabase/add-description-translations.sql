-- Ajoute les champs de description traduite (EN/ES/IT) sur la table vehicules
-- Si vide, le site affiche la description française par défaut.
ALTER TABLE vehicules
  ADD COLUMN IF NOT EXISTS description_en TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description_es TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description_it TEXT DEFAULT NULL;
