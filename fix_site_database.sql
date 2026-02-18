-- ============================================================
-- FIX DATABASE — Projet Site (nbphxiuuxgsavoblyqmj)
-- À exécuter dans Supabase SQL Editor si le trigger ne fonctionne pas
-- ============================================================

-- 1. S'assurer que les types ENUM existent
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'company', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE profile_status AS ENUM ('incomplete', 'complete', 'verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table users (si pas encore créée)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE NOT NULL,
    name            TEXT DEFAULT '',
    role            user_role NOT NULL DEFAULT 'student',
    profile_status  profile_status DEFAULT 'incomplete',
    is_active       BOOLEAN DEFAULT true,
    email_verified  BOOLEAN DEFAULT false,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies users (DROP + CREATE pour éviter les doublons)
DROP POLICY IF EXISTS "users: select own" ON users;
DROP POLICY IF EXISTS "users: insert trigger" ON users;
DROP POLICY IF EXISTS "users: update own" ON users;
DROP POLICY IF EXISTS "users: insert par trigger" ON users;

CREATE POLICY "users: select own"     ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users: insert trigger" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users: update own"     ON users FOR UPDATE USING (id = auth.uid());

-- 3. Trigger tolérant handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role text;
  _name text;
BEGIN
  _role := coalesce(NEW.raw_user_meta_data->>'role', 'student');
  IF _role NOT IN ('student','company','admin') THEN _role := 'student'; END IF;
  _name := coalesce(
    nullif(NEW.raw_user_meta_data->>'firstName', ''),
    nullif(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (id, email, name, role, profile_status)
  VALUES (NEW.id, NEW.email, _name, _role::user_role, 'incomplete')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user: % (SQLSTATE %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Table student_profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name      TEXT DEFAULT '',
    last_name       TEXT DEFAULT '',
    phone           TEXT DEFAULT '',
    date_of_birth   TEXT,
    address         TEXT,
    city            TEXT,
    postal_code     TEXT,
    education_level TEXT,
    field_of_study  TEXT,
    graduation_year INTEGER,
    skills          TEXT[] DEFAULT '{}',
    languages       TEXT[] DEFAULT '{}',
    experience_years INTEGER DEFAULT 0,
    cv_url          TEXT,
    portfolio_url   TEXT,
    linkedin_url    TEXT,
    github_url      TEXT,
    availability    TEXT,
    work_permit     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_profiles: own" ON student_profiles;
CREATE POLICY "student_profiles: own" ON student_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. Table company_profiles
CREATE TABLE IF NOT EXISTS company_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name        TEXT DEFAULT '',
    company_description TEXT,
    company_size        TEXT,
    industry            TEXT,
    website_url         TEXT,
    phone               TEXT,
    address             TEXT,
    city                TEXT,
    postal_code         TEXT,
    logo_url            TEXT,
    company_type        TEXT,
    founded_year        INTEGER,
    linkedin_url        TEXT,
    twitter_url         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_profiles: own" ON company_profiles;
DROP POLICY IF EXISTS "company_profiles: read public" ON company_profiles;
CREATE POLICY "company_profiles: own" ON company_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "company_profiles: read public" ON company_profiles
  FOR SELECT USING (true);

-- 6. Storage buckets (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-files', 'cv-files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-docs', 'company-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies (DROP old + CREATE avec syntaxe correcte TO authenticated)
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

-- cv-files : chaque candidat peut uploader/lire/supprimer son propre dossier
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

-- company-logos : upload/modif par l'entreprise propriétaire, lecture publique
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

-- company-docs : mêmes droits que cv-files
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

-- 8. Vérification finale
SELECT
  'users' as table_name, count(*) as rows FROM users
UNION ALL
SELECT 'student_profiles', count(*) FROM student_profiles
UNION ALL
SELECT 'company_profiles', count(*) FROM company_profiles;
