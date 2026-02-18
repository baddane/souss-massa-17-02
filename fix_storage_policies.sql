-- ============================================================
-- FIX STORAGE POLICIES — À coller dans Supabase SQL Editor
-- Projet : nbphxiuuxgsavoblyqmj (Site)
-- ============================================================

-- Supprimer les anciennes policies (si elles existent avec la mauvaise syntaxe)
DROP POLICY IF EXISTS "cv: upload own"   ON storage.objects;
DROP POLICY IF EXISTS "cv: read own"     ON storage.objects;
DROP POLICY IF EXISTS "cv: update own"   ON storage.objects;
DROP POLICY IF EXISTS "cv: delete own"   ON storage.objects;
DROP POLICY IF EXISTS "logo: upload own" ON storage.objects;
DROP POLICY IF EXISTS "logo: read all"   ON storage.objects;
DROP POLICY IF EXISTS "logo: update own" ON storage.objects;
DROP POLICY IF EXISTS "logo: delete own" ON storage.objects;
DROP POLICY IF EXISTS "docs: upload own" ON storage.objects;
DROP POLICY IF EXISTS "docs: read own"   ON storage.objects;

-- ✅ cv-files : candidats peuvent gérer leurs propres CVs
CREATE POLICY "cv: upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "cv: read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cv-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "cv: update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cv-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "cv: delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cv-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ✅ company-logos : entreprises uploadent leur logo, tout le monde peut lire
CREATE POLICY "logo: upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "logo: read all" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'company-logos');

CREATE POLICY "logo: update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "logo: delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ✅ company-docs : entreprises gèrent leurs documents
CREATE POLICY "docs: upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "docs: read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Vérification : liste les policies créées
SELECT policyname, cmd, tablename
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
