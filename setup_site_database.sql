-- ================================================================
-- SETUP COMPLET — COMPTE SUPABASE 1 (SITE)
-- SoussMassa-RH : authentification, profils, candidatures
-- ================================================================
-- COMMENT UTILISER CE FICHIER :
--   1. Ouvre Supabase → ton projet Site → "SQL Editor"
--   2. Colle tout ce fichier → clique "Run"
--   C'est tout !
-- ================================================================


-- ----------------------------------------------------------------
-- ÉTAPE 1 — EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ----------------------------------------------------------------
-- ÉTAPE 2 — TYPES ÉNUMÉRÉS
-- (définir les valeurs possibles pour certains champs)
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role         AS ENUM ('student', 'company', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE profile_status    AS ENUM ('incomplete', 'complete', 'verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_type     AS ENUM ('stage', 'alternance', 'cdd', 'cdi', 'freelance', 'interim');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE work_type         AS ENUM ('teletravail', 'presentiel', 'hybride');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE experience_level  AS ENUM ('junior', 'intermediaire', 'senior', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('soumise', 'en_cours', 'entretien', 'refusee', 'embauchee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('nouvelle_offre', 'candidature', 'message', 'rappel', 'systeme');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ----------------------------------------------------------------
-- ÉTAPE 3 — TABLE USERS
-- Liée à auth.users de Supabase (même id)
-- Créée automatiquement lors de l'inscription
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255),
    role            user_role NOT NULL DEFAULT 'student',
    profile_status  profile_status DEFAULT 'incomplete',
    is_active       BOOLEAN DEFAULT true,
    email_verified  BOOLEAN DEFAULT false,
    last_login      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ÉTAPE 4 — TRIGGER : créer la ligne users automatiquement
-- quand quelqu'un s'inscrit via Supabase Auth
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------
-- ÉTAPE 5 — PROFILS CANDIDATS (étudiants / demandeurs d'emploi)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_profiles (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name       VARCHAR(100),
    last_name        VARCHAR(100),
    phone            VARCHAR(20),
    date_of_birth    DATE,
    address          TEXT,
    city             VARCHAR(100),
    postal_code      VARCHAR(10),
    education_level  VARCHAR(100),
    field_of_study   VARCHAR(200),
    graduation_year  INTEGER,
    skills           TEXT[]  DEFAULT '{}',
    languages        TEXT[]  DEFAULT '{}',
    experience_years INTEGER DEFAULT 0,
    cv_url           TEXT,
    portfolio_url    TEXT,
    linkedin_url     TEXT,
    github_url       TEXT,
    availability     VARCHAR(50),
    work_permit      VARCHAR(100),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- ÉTAPE 6 — PROFILS ENTREPRISES (comptes entreprises inscrits)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_profiles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name         VARCHAR(200) NOT NULL,
    company_description  TEXT,
    company_size         VARCHAR(50),
    industry             VARCHAR(100),
    website_url          TEXT,
    phone                VARCHAR(20),
    address              TEXT,
    city                 VARCHAR(100),
    postal_code          VARCHAR(10),
    logo_url             TEXT,
    company_type         VARCHAR(50),
    founded_year         INTEGER,
    linkedin_url         TEXT,
    twitter_url          TEXT,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- ÉTAPE 7 — OFFRES D'EMPLOI (publiées par les entreprises inscrites)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_offers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    description      TEXT NOT NULL,
    requirements     TEXT NOT NULL,
    responsibilities TEXT,
    contract_type    contract_type NOT NULL,
    work_type        work_type NOT NULL,
    experience_level experience_level,
    salary_min       DECIMAL(10,2),
    salary_max       DECIMAL(10,2),
    salary_currency  VARCHAR(3) DEFAULT 'MAD',
    location_city    VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Maroc',
    is_remote        BOOLEAN DEFAULT false,
    is_active        BOOLEAN DEFAULT true,
    expires_at       TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- ÉTAPE 8 — CANDIDATURES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_offer_id        UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    status              application_status DEFAULT 'soumise',
    cover_letter        TEXT,
    viewed_by_company   BOOLEAN DEFAULT false,
    submitted_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- ÉTAPE 9 — NOTIFICATIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       notification_type NOT NULL,
    title      VARCHAR(200) NOT NULL,
    message    TEXT NOT NULL,
    data       JSONB,
    is_read    BOOLEAN DEFAULT false,
    read_at    TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ----------------------------------------------------------------
-- ÉTAPE 10 — TRIGGER : mise à jour automatique de updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at           ON users;
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
DROP TRIGGER IF EXISTS update_company_profiles_updated_at ON company_profiles;
DROP TRIGGER IF EXISTS update_job_offers_updated_at       ON job_offers;
DROP TRIGGER IF EXISTS update_applications_updated_at     ON applications;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_profiles_updated_at
  BEFORE UPDATE ON company_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_offers_updated_at
  BEFORE UPDATE ON job_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------
-- ÉTAPE 11 — INDEX (performances des requêtes)
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role              ON users(role);

CREATE INDEX IF NOT EXISTS idx_student_user            ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_user            ON company_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_job_company             ON job_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_job_active              ON job_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_job_contract_type       ON job_offers(contract_type);
CREATE INDEX IF NOT EXISTS idx_job_created_at          ON job_offers(created_at);

CREATE INDEX IF NOT EXISTS idx_app_job_offer           ON applications(job_offer_id);
CREATE INDEX IF NOT EXISTS idx_app_student             ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_app_status              ON applications(status);

CREATE INDEX IF NOT EXISTS idx_notif_user              ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read           ON notifications(is_read);


-- ----------------------------------------------------------------
-- ÉTAPE 12 — VUES (statistiques)
-- ----------------------------------------------------------------

-- Statistiques des offres par entreprise
CREATE OR REPLACE VIEW company_job_stats AS
SELECT
    cp.id            AS company_id,
    cp.company_name,
    COUNT(jo.id)                                           AS total_offers,
    COUNT(jo.id) FILTER (WHERE jo.is_active)               AS active_offers,
    COUNT(jo.id) FILTER (WHERE jo.contract_type = 'stage') AS stage_offers,
    COUNT(jo.id) FILTER (WHERE jo.contract_type = 'cdi')   AS cdi_offers,
    COUNT(jo.id) FILTER (WHERE jo.work_type = 'teletravail') AS remote_offers
FROM company_profiles cp
LEFT JOIN job_offers jo ON cp.id = jo.company_id
GROUP BY cp.id, cp.company_name;

-- Statistiques des candidatures par offre
CREATE OR REPLACE VIEW job_application_stats AS
SELECT
    jo.id            AS job_id,
    jo.title,
    cp.company_name,
    COUNT(a.id)                                               AS total_applications,
    COUNT(a.id) FILTER (WHERE a.status = 'soumise')           AS submitted,
    COUNT(a.id) FILTER (WHERE a.status = 'entretien')         AS interviews,
    COUNT(a.id) FILTER (WHERE a.status = 'embauchee')         AS hired,
    COUNT(a.id) FILTER (WHERE a.status = 'refusee')           AS rejected
FROM job_offers jo
LEFT JOIN company_profiles cp ON jo.company_id = cp.id
LEFT JOIN applications a      ON jo.id = a.job_offer_id
WHERE jo.is_active = true
GROUP BY jo.id, jo.title, cp.company_name;


-- ================================================================
-- ÉTAPE 13 — SÉCURITÉ (Row Level Security)
-- Chaque utilisateur ne voit que ses propres données
-- ================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;

-- ── TABLE users ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "users: voir son propre profil"   ON users;
DROP POLICY IF EXISTS "users: modifier son propre profil" ON users;
DROP POLICY IF EXISTS "users: insert par trigger"       ON users;

CREATE POLICY "users: voir son propre profil"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users: modifier son propre profil"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Permet au trigger (SECURITY DEFINER) d'insérer lors de l'inscription
CREATE POLICY "users: insert par trigger"
  ON users FOR INSERT
  WITH CHECK (true);

-- ── TABLE student_profiles ───────────────────────────────────────
DROP POLICY IF EXISTS "student: gérer son propre profil"  ON student_profiles;
DROP POLICY IF EXISTS "company: voir les profils candidats" ON student_profiles;

CREATE POLICY "student: gérer son propre profil"
  ON student_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les entreprises connectées peuvent consulter les profils candidats
CREATE POLICY "company: voir les profils candidats"
  ON student_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'company'
    )
  );

-- ── TABLE company_profiles ───────────────────────────────────────
DROP POLICY IF EXISTS "company: gérer son propre profil"    ON company_profiles;
DROP POLICY IF EXISTS "student: voir les profils entreprise" ON company_profiles;

CREATE POLICY "company: gérer son propre profil"
  ON company_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les candidats peuvent consulter les profils entreprises
CREATE POLICY "student: voir les profils entreprise"
  ON company_profiles FOR SELECT
  USING (true);

-- ── TABLE job_offers ─────────────────────────────────────────────
DROP POLICY IF EXISTS "job: lecture publique des offres actives" ON job_offers;
DROP POLICY IF EXISTS "job: entreprise gère ses propres offres"  ON job_offers;

CREATE POLICY "job: lecture publique des offres actives"
  ON job_offers FOR SELECT
  USING (is_active = true);

CREATE POLICY "job: entreprise gère ses propres offres"
  ON job_offers FOR ALL
  USING (
    company_id IN (
      SELECT id FROM company_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM company_profiles WHERE user_id = auth.uid()
    )
  );

-- ── TABLE applications ───────────────────────────────────────────
DROP POLICY IF EXISTS "app: candidat gère ses candidatures"           ON applications;
DROP POLICY IF EXISTS "app: entreprise voit candidatures à ses offres" ON applications;

CREATE POLICY "app: candidat gère ses candidatures"
  ON applications FOR ALL
  USING (
    student_id IN (
      SELECT id FROM student_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM student_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "app: entreprise voit candidatures à ses offres"
  ON applications FOR SELECT
  USING (
    job_offer_id IN (
      SELECT jo.id FROM job_offers jo
      JOIN company_profiles cp ON jo.company_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Mise à jour du statut par l'entreprise
CREATE POLICY "app: entreprise met à jour le statut"
  ON applications FOR UPDATE
  USING (
    job_offer_id IN (
      SELECT jo.id FROM job_offers jo
      JOIN company_profiles cp ON jo.company_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- ── TABLE notifications ──────────────────────────────────────────
DROP POLICY IF EXISTS "notif: voir ses propres notifications" ON notifications;

CREATE POLICY "notif: voir ses propres notifications"
  ON notifications FOR ALL
  USING (user_id = auth.uid());


-- ================================================================
-- ÉTAPE 14 — STORAGE (Buckets pour les fichiers)
-- Ces policies s'appliquent APRÈS avoir créé les buckets dans
-- Storage > New bucket (noms exacts ci-dessous)
-- ================================================================

-- ── Bucket : cv-files ─────────────────────────────────────────────
DROP POLICY IF EXISTS "cv: candidat upload son cv"    ON storage.objects;
DROP POLICY IF EXISTS "cv: candidat lit son cv"       ON storage.objects;
DROP POLICY IF EXISTS "cv: candidat supprime son cv"  ON storage.objects;
DROP POLICY IF EXISTS "cv: entreprise lit les cvs"    ON storage.objects;

-- Le candidat peut uploader/modifier/supprimer son propre CV
CREATE POLICY "cv: candidat upload son cv"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cv-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "cv: candidat lit son cv"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cv-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "cv: candidat supprime son cv"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cv-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Les entreprises peuvent lire les CVs (pour consulter les candidatures)
CREATE POLICY "cv: entreprise lit les cvs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cv-files'
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'company'
    )
  );

-- ── Bucket : company-logos ────────────────────────────────────────
DROP POLICY IF EXISTS "logo: entreprise gère son logo" ON storage.objects;
DROP POLICY IF EXISTS "logo: lecture publique"         ON storage.objects;

CREATE POLICY "logo: entreprise gère son logo"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "logo: lecture publique"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

-- ── Bucket : company-docs ─────────────────────────────────────────
DROP POLICY IF EXISTS "doc: entreprise gère ses documents" ON storage.objects;

CREATE POLICY "doc: entreprise gère ses documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'company-docs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'company-docs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ================================================================
-- FIN — BASE DE DONNÉES SITE CONFIGURÉE
-- ================================================================
-- Résumé des tables créées :
--   users            → comptes utilisateurs (liés à auth.users)
--   student_profiles → profils candidats
--   company_profiles → profils entreprises
--   job_offers       → offres publiées par les entreprises
--   applications     → candidatures
--   notifications    → alertes utilisateurs
--
-- Vues créées :
--   company_job_stats      → stats offres par entreprise
--   job_application_stats  → stats candidatures par offre
--
-- Buckets Storage à créer manuellement :
--   cv-files        (privé)
--   company-logos   (public)
--   company-docs    (privé)
-- ================================================================
