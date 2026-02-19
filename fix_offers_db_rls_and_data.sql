-- ============================================================
-- À exécuter sur la base de données des OFFRES (supabaseOffers)
-- Crée les tables + policies RLS + active les données
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES
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
    company_size VARCHAR(50),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON companies;
CREATE POLICY "Companies are viewable by everyone" ON companies FOR SELECT USING (true);

UPDATE companies SET is_active = true WHERE is_active IS DISTINCT FROM true;

-- ============================================================
-- SCHOOLS
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
    school_type VARCHAR(50),
    programs TEXT[],
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(school_type);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Schools are viewable by everyone" ON schools;
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);

UPDATE schools SET is_active = true WHERE is_active IS DISTINCT FROM true;

-- ============================================================
-- ADVICE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS advice_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE advice_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Advice categories are viewable by everyone" ON advice_categories;
CREATE POLICY "Advice categories are viewable by everyone" ON advice_categories FOR SELECT USING (true);

INSERT INTO advice_categories (name, description, color) VALUES
('CV et Lettres de Motivation', 'Conseils pour créer un CV percutant', '#3B82F6'),
('Entretiens', 'Techniques pour réussir vos entretiens', '#10B981'),
('Recherche d''emploi', 'Stratégies pour une recherche efficace', '#F59E0B'),
('Développement Personnel', 'Conseils pour votre épanouissement professionnel', '#8B5CF6'),
('Compétences', 'Développement de vos compétences professionnelles', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ADVICE ARTICLES
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
    reading_time INTEGER,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advice_articles_category ON advice_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_advice_articles_published ON advice_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_advice_articles_published_at ON advice_articles(published_at);

ALTER TABLE advice_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Advice articles are viewable by everyone" ON advice_articles;
CREATE POLICY "Advice articles are viewable by everyone" ON advice_articles FOR SELECT USING (true);

UPDATE advice_articles
SET is_published = true, published_at = COALESCE(published_at, NOW())
WHERE is_published IS DISTINCT FROM true;

-- ============================================================
-- BLOG CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Blog categories are viewable by everyone" ON blog_categories;
CREATE POLICY "Blog categories are viewable by everyone" ON blog_categories FOR SELECT USING (true);

INSERT INTO blog_categories (name, description, slug) VALUES
('Actualités Emploi', 'Toute l''actualité de l''emploi dans le Souss-Massa', 'actualites-emploi'),
('Conseils Carrière', 'Nos meilleurs conseils pour votre carrière', 'conseils-carriere'),
('Entreprises Locales', 'Découvrez les entreprises qui recrutent', 'entreprises-locales'),
('Formations', 'Informations sur les formations', 'formations'),
('Success Stories', 'Des histoires de réussite professionnelle', 'success-stories')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- BLOG POSTS
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
    reading_time INTEGER,
    tags TEXT[],
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Blog posts are viewable by everyone" ON blog_posts;
CREATE POLICY "Blog posts are viewable by everyone" ON blog_posts FOR SELECT USING (true);

UPDATE blog_posts
SET is_published = true, published_at = COALESCE(published_at, NOW())
WHERE is_published IS DISTINCT FROM true;

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_advice_articles_updated_at ON advice_articles;
CREATE TRIGGER update_advice_articles_updated_at BEFORE UPDATE ON advice_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
