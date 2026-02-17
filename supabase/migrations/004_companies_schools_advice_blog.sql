-- Create companies table
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

-- Create schools table
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
    programs TEXT[], -- Array of program names
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advice_categories table
CREATE TABLE IF NOT EXISTS advice_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advice_articles table
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
    reading_time INTEGER, -- in minutes
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_posts table
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
    reading_time INTEGER, -- in minutes
    tags TEXT[], -- Array of tags
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(school_type);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);

CREATE INDEX IF NOT EXISTS idx_advice_articles_category ON advice_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_advice_articles_published ON advice_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_advice_articles_published_at ON advice_articles(published_at);

CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- Insert default advice categories
INSERT INTO advice_categories (name, description, color) VALUES
('CV et Lettres de Motivation', 'Conseils pour créer un CV percutant et une lettre de motivation efficace', '#3B82F6'),
('Entretiens', 'Préparation et techniques pour réussir vos entretiens d''embauche', '#10B981'),
('Recherche d''emploi', 'Stratégies et outils pour une recherche d''emploi efficace', '#F59E0B'),
('Développement Personnel', 'Conseils pour votre épanouissement professionnel', '#8B5CF6'),
('Compétences', 'Développement et valorisation de vos compétences professionnelles', '#EF4444');

-- Insert default blog categories
INSERT INTO blog_categories (name, description, slug) VALUES
('Actualités Emploi', 'Toute l''actualité de l''emploi dans le Souss-Massa', 'actualites-emploi'),
('Conseils Carrière', 'Nos meilleurs conseils pour votre carrière professionnelle', 'conseils-carriere'),
('Entreprises Locales', 'Découvrez les entreprises qui recrutent dans la région', 'entreprises-locales'),
('Formations', 'Informations sur les formations et opportunités d''apprentissage', 'formations'),
('Success Stories', 'Des histoires inspirantes de réussite professionnelle', 'success-stories');

-- Create RLS policies for companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are viewable by everyone" ON companies FOR SELECT USING (true);
CREATE POLICY "Companies can be inserted by authenticated users" ON companies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Companies can be updated by authenticated users" ON companies FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Companies can be deleted by authenticated users" ON companies FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for schools
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);
CREATE POLICY "Schools can be inserted by authenticated users" ON schools FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Schools can be updated by authenticated users" ON schools FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Schools can be deleted by authenticated users" ON schools FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for advice_categories
ALTER TABLE advice_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advice categories are viewable by everyone" ON advice_categories FOR SELECT USING (true);
CREATE POLICY "Advice categories can be managed by authenticated users" ON advice_categories FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for advice_articles
ALTER TABLE advice_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advice articles are viewable by everyone" ON advice_articles FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY "Advice articles can be managed by authenticated users" ON advice_articles FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for blog_categories
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog categories are viewable by everyone" ON blog_categories FOR SELECT USING (true);
CREATE POLICY "Blog categories can be managed by authenticated users" ON blog_categories FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for blog_posts
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog posts are viewable by everyone" ON blog_posts FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY "Blog posts can be managed by authenticated users" ON blog_posts FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_advice_articles_updated_at BEFORE UPDATE ON advice_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();