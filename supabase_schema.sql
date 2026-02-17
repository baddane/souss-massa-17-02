-- ===============================================
-- SCHÉMA SUPABASE POUR SOUSSMASSA-RH
-- ===============================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- TABLES UTILISATEURS
-- ===============================================

-- Types d'utilisateurs
CREATE TYPE user_role AS ENUM ('student', 'company', 'admin');
CREATE TYPE profile_status AS ENUM ('incomplete', 'complete', 'verified');

-- Table principale des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    profile_status profile_status DEFAULT 'incomplete',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false
);

-- Profils étudiants/candidats
CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    education_level VARCHAR(100),
    field_of_study VARCHAR(200),
    graduation_year INTEGER,
    skills TEXT[], -- Tableau de compétences
    languages TEXT[], -- Tableau de langues
    experience_years INTEGER DEFAULT 0,
    cv_url TEXT, -- URL vers le CV stocké dans Supabase Storage
    portfolio_url TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    availability VARCHAR(50), -- "immédiate", "1 mois", etc.
    work_permit VARCHAR(100), -- "Maroc", "UE", "Tous", etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Profils entreprises
CREATE TABLE company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    company_description TEXT,
    company_size VARCHAR(50), -- "1-10", "11-50", "51-200", etc.
    industry VARCHAR(100),
    website_url TEXT,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    logo_url TEXT, -- URL vers le logo dans Supabase Storage
    company_type VARCHAR(50), -- "Startup", "ETI", "GE", etc.
    founded_year INTEGER,
    linkedin_url TEXT,
    twitter_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===============================================
-- TABLES OFFRES D'EMPLOI
-- ===============================================

-- Types de contrats
CREATE TYPE contract_type AS ENUM ('stage', 'alternance', 'cdd', 'cdi', 'freelance', 'interim');
CREATE TYPE work_type AS ENUM ('teletravail', 'presentiel', 'hybride');
CREATE TYPE experience_level AS ENUM ('junior', 'intermediaire', 'senior', 'expert');

-- Table des offres d'emploi
CREATE TABLE job_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    responsibilities TEXT,
    contract_type contract_type NOT NULL,
    work_type work_type NOT NULL,
    experience_level experience_level,
    salary_min DECIMAL(10,2),
    salary_max DECIMAL(10,2),
    salary_currency VARCHAR(3) DEFAULT 'MAD',
    location_city VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Maroc',
    is_remote BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_job_company FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
);

-- Catégories de métiers
CREATE TABLE job_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relation offres <-> catégories (many-to-many)
CREATE TABLE job_offer_categories (
    job_offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES job_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (job_offer_id, category_id)
);

-- ===============================================
-- TABLES CANDIDATURES
-- ===============================================

-- Statuts de candidature
CREATE TYPE application_status AS ENUM ('soumise', 'en_cours', 'entretien', 'refusee', 'embauchee');

-- Table des candidatures
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    status application_status DEFAULT 'soumise',
    cover_letter TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_by_company BOOLEAN DEFAULT false,
    
    CONSTRAINT fk_application_job FOREIGN KEY (job_offer_id) REFERENCES job_offers(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
);

-- ===============================================
-- TABLES ÉCOLES ET FORMATIONS
-- ===============================================

-- Table des écoles partenaires
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    website_url TEXT,
    logo_url TEXT,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_partner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relations écoles <-> étudiants
CREATE TABLE school_students (
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    enrollment_year INTEGER,
    graduation_year INTEGER,
    degree_obtained VARCHAR(100),
    field_of_study VARCHAR(200),
    PRIMARY KEY (school_id, student_id)
);

-- ===============================================
-- TABLES CONSEILS ET BLOG
-- ===============================================

-- Catégories d'articles
CREATE TYPE article_category AS ENUM ('conseils', 'actualites', 'tutoriels', 'temoignages');

-- Table des articles de blog/conseils
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category article_category NOT NULL,
    author_id UUID REFERENCES users(id),
    image_url TEXT, -- URL vers l'image dans Supabase Storage
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_article_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ===============================================
-- TABLES NOTIFICATIONS
-- ===============================================

-- Types de notifications
CREATE TYPE notification_type AS ENUM ('nouvelle_offre', 'candidature', 'message', 'rappel', 'systeme');

-- Table des notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Données supplémentaires (ID offre, etc.)
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===============================================
-- INDEXES POUR LES PERFORMANCES
-- ===============================================

-- Indexes sur les colonnes fréquemment utilisées
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_profile_status ON users(profile_status);

CREATE INDEX idx_job_offers_company ON job_offers(company_id);
CREATE INDEX idx_job_offers_contract_type ON job_offers(contract_type);
CREATE INDEX idx_job_offers_work_type ON job_offers(work_type);
CREATE INDEX idx_job_offers_experience_level ON job_offers(experience_level);
CREATE INDEX idx_job_offers_is_active ON job_offers(is_active);
CREATE INDEX idx_job_offers_created_at ON job_offers(created_at);

CREATE INDEX idx_applications_job_offer ON applications(job_offer_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_company_profiles_user_id ON company_profiles(user_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Index pour la recherche full-text sur les offres
CREATE INDEX idx_job_offers_title_gin ON job_offers USING GIN (to_tsvector('french', title));
CREATE INDEX idx_job_offers_description_gin ON job_offers USING GIN (to_tsvector('french', description));

-- ===============================================
-- TRIGGERS POUR LES DATES DE MISE À JOUR
-- ===============================================

-- Fonction pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour les tables principales
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_offers_updated_at BEFORE UPDATE ON job_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- VUES POUR LES STATISTIQUES ET ANALYSES
-- ===============================================

-- Vue pour les statistiques des offres par entreprise
CREATE VIEW company_job_stats AS
SELECT 
    cp.company_name,
    COUNT(jo.id) as total_offers,
    COUNT(CASE WHEN jo.is_active THEN 1 END) as active_offers,
    COUNT(CASE WHEN jo.contract_type = 'stage' THEN 1 END) as stage_offers,
    COUNT(CASE WHEN jo.contract_type = 'cdi' THEN 1 END) as cdi_offers,
    COUNT(CASE WHEN jo.work_type = 'teletravail' THEN 1 END) as remote_offers
FROM company_profiles cp
LEFT JOIN job_offers jo ON cp.id = jo.company_id
GROUP BY cp.id, cp.company_name;

-- Vue pour les statistiques des candidatures par offre
CREATE VIEW job_application_stats AS
SELECT 
    jo.title,
    cp.company_name,
    COUNT(a.id) as total_applications,
    COUNT(CASE WHEN a.status = 'soumise' THEN 1 END) as submitted,
    COUNT(CASE WHEN a.status = 'entretien' THEN 1 END) as interviews,
    COUNT(CASE WHEN a.status = 'embauchee' THEN 1 END) as hired,
    COUNT(CASE WHEN a.status = 'refusee' THEN 1 END) as rejected
FROM job_offers jo
LEFT JOIN company_profiles cp ON jo.company_id = cp.id
LEFT JOIN applications a ON jo.id = a.job_offer_id
WHERE jo.is_active = true
GROUP BY jo.id, jo.title, cp.company_name;

-- ===============================================
-- POLICIES RLS (Row Level Security) - À CONFIGURER SELON VOS BESOINS
-- ===============================================

-- Activer RLS sur les tables sensibles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Exemple de politique de base (à adapter selon votre authentification)
-- Seul l'utilisateur peut voir/modifier son profil
-- CREATE POLICY "Users can view own profile" ON users FOR ALL USING (id = auth.uid());
-- CREATE POLICY "Students can view own profile" ON student_profiles FOR ALL USING (user_id = auth.uid());
-- CREATE POLICY "Companies can view own profile" ON company_profiles FOR ALL USING (user_id = auth.uid());

-- ===============================================
-- DONNÉES INITIALES (OPTIONNEL)
-- ===============================================

-- Catégories d'offres types
INSERT INTO job_categories (name, description) VALUES
('Informatique', 'Développement, administration, cybersécurité'),
('Commerce', 'Vente, marketing, commerce international'),
('Ingénierie', 'Génie civil, mécanique, électrique'),
('Santé', 'Médecine, pharmacie, paramédical'),
('Finance', 'Banque, assurance, comptabilité'),
('Hôtellerie', 'Tourisme, restauration, événementiel'),
('Éducation', 'Enseignement, formation'),
('Logistique', 'Transport, supply chain, entrepôt');

-- Exemple d'utilisateur admin (à modifier avec un mot de passe sécurisé)
-- INSERT INTO users (email, name, role, profile_status, email_verified) VALUES
-- ('admin@soussmassa-rh.com', 'Administrateur', 'admin', 'complete', true);

-- ===============================================
-- FIN DU SCHÉMA SUPABASE
-- ===============================================