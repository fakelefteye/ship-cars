-- Ajoute le 4e niveau de prix (été / très forte demande) sur la table vehicules
ALTER TABLE vehicules
  ADD COLUMN IF NOT EXISTS prix_tres_haute DECIMAL(10,2) DEFAULT NULL;
