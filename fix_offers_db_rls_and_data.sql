-- ============================================================
-- À exécuter sur la base de données des OFFRES (supabaseOffers)
-- Active la lecture publique sur entreprises, ecoles, conseils
-- ============================================================

-- ENTREPRISES
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read entreprises" ON entreprises;
CREATE POLICY "Public read entreprises" ON entreprises FOR SELECT USING (true);

-- ECOLES
ALTER TABLE ecoles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read ecoles" ON ecoles;
CREATE POLICY "Public read ecoles" ON ecoles FOR SELECT USING (true);

-- CONSEILS
ALTER TABLE conseils ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read conseils" ON conseils;
CREATE POLICY "Public read conseils" ON conseils FOR SELECT USING (true);
