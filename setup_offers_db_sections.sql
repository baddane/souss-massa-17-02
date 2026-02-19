-- ============================================================
-- SQL à exécuter sur la BASE DE DONNÉES EXTERNE (supabaseOffers)
-- Configurée avec VITE_SUPABASE_OFFERS_URL et VITE_SUPABASE_OFFERS_ANON_KEY
--
-- Ce script crée les tables Entreprises, Écoles, Conseils et Blog
-- dans la même base de données que les Offres d'emploi.
-- ============================================================

-- Activer l'extension UUID si pas déjà active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: companies (Entreprises)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    industry VARCHAR(100),
    company_size VARCHAR(50), -- "1-10", "11-50", "51-200", "201-500", "500+"
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- RLS policies pour companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies are viewable by everyone" ON companies;
CREATE POLICY "Companies are viewable by everyone" ON companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Companies can be inserted by authenticated users" ON companies;
CREATE POLICY "Companies can be inserted by authenticated users" ON companies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Companies can be updated by authenticated users" ON companies;
CREATE POLICY "Companies can be updated by authenticated users" ON companies FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Companies can be deleted by authenticated users" ON companies;
CREATE POLICY "Companies can be deleted by authenticated users" ON companies FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- TABLE: schools (Écoles)
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    school_type VARCHAR(50), -- "Université", "École d'ingénieurs", "École de commerce", "Lycée", "Centre de formation"
    programs TEXT[], -- Tableau des filières proposées
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(school_type);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);

-- RLS policies pour schools
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schools are viewable by everyone" ON schools;
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Schools can be inserted by authenticated users" ON schools;
CREATE POLICY "Schools can be inserted by authenticated users" ON schools FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Schools can be updated by authenticated users" ON schools;
CREATE POLICY "Schools can be updated by authenticated users" ON schools FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Schools can be deleted by authenticated users" ON schools;
CREATE POLICY "Schools can be deleted by authenticated users" ON schools FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- TABLE: advice_categories (Catégories Conseils)
-- ============================================================
CREATE TABLE IF NOT EXISTS advice_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Code couleur hex
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies pour advice_categories
ALTER TABLE advice_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advice categories are viewable by everyone" ON advice_categories;
CREATE POLICY "Advice categories are viewable by everyone" ON advice_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Advice categories can be managed by authenticated users" ON advice_categories;
CREATE POLICY "Advice categories can be managed by authenticated users" ON advice_categories FOR ALL USING (auth.role() = 'authenticated');

-- Insérer les catégories de conseils par défaut
INSERT INTO advice_categories (name, description, color) VALUES
('CV et Lettres de Motivation', 'Conseils pour créer un CV percutant et une lettre de motivation efficace', '#3B82F6'),
('Entretiens', 'Préparation et techniques pour réussir vos entretiens d''embauche', '#10B981'),
('Recherche d''emploi', 'Stratégies et outils pour une recherche d''emploi efficace', '#F59E0B'),
('Développement Personnel', 'Conseils pour votre épanouissement professionnel', '#8B5CF6'),
('Compétences', 'Développement et valorisation de vos compétences professionnelles', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLE: advice_articles (Articles Conseils)
-- ============================================================
CREATE TABLE IF NOT EXISTS advice_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    content TEXT NOT NULL,
    category_id UUID REFERENCES advice_categories(id),
    author VARCHAR(100),
    author_title VARCHAR(100),
    author_avatar_url TEXT,
    featured_image_url TEXT,
    reading_time INTEGER, -- en minutes
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_advice_articles_category ON advice_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_advice_articles_published ON advice_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_advice_articles_published_at ON advice_articles(published_at);

-- RLS policies pour advice_articles
ALTER TABLE advice_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advice articles are viewable by everyone" ON advice_articles;
CREATE POLICY "Advice articles are viewable by everyone" ON advice_articles FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Advice articles can be managed by authenticated users" ON advice_articles;
CREATE POLICY "Advice articles can be managed by authenticated users" ON advice_articles FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- TABLE: blog_categories (Catégories Blog)
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies pour blog_categories
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blog categories are viewable by everyone" ON blog_categories;
CREATE POLICY "Blog categories are viewable by everyone" ON blog_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Blog categories can be managed by authenticated users" ON blog_categories;
CREATE POLICY "Blog categories can be managed by authenticated users" ON blog_categories FOR ALL USING (auth.role() = 'authenticated');

-- Insérer les catégories de blog par défaut
INSERT INTO blog_categories (name, description, slug) VALUES
('Actualités Emploi', 'Toute l''actualité de l''emploi dans le Souss-Massa', 'actualites-emploi'),
('Conseils Carrière', 'Nos meilleurs conseils pour votre carrière professionnelle', 'conseils-carriere'),
('Entreprises Locales', 'Découvrez les entreprises qui recrutent dans la région', 'entreprises-locales'),
('Formations', 'Informations sur les formations et opportunités d''apprentissage', 'formations'),
('Success Stories', 'Des histoires inspirantes de réussite professionnelle', 'success-stories')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLE: blog_posts (Articles Blog)
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    content TEXT NOT NULL,
    category_id UUID REFERENCES blog_categories(id),
    author VARCHAR(100),
    author_bio TEXT,
    author_avatar_url TEXT,
    featured_image_url TEXT,
    reading_time INTEGER, -- en minutes
    tags TEXT[], -- Tableau de tags
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- RLS policies pour blog_posts
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blog posts are viewable by everyone" ON blog_posts;
CREATE POLICY "Blog posts are viewable by everyone" ON blog_posts FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Blog posts can be managed by authenticated users" ON blog_posts;
CREATE POLICY "Blog posts can be managed by authenticated users" ON blog_posts FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- TRIGGER: mise à jour automatique du champ updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_advice_articles_updated_at ON advice_articles;
CREATE TRIGGER update_advice_articles_updated_at
    BEFORE UPDATE ON advice_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
