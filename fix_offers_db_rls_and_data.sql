-- ============================================================
-- À exécuter sur la base de données des OFFRES (supabaseOffers)
-- Règle les policies RLS et les valeurs is_active / is_published
-- ============================================================

-- 1. COMPANIES : activer la lecture publique + rendre toutes les entrées actives
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies are viewable by everyone" ON companies;
CREATE POLICY "Companies are viewable by everyone" ON companies
  FOR SELECT USING (true);

-- Rendre toutes les entreprises existantes visibles
UPDATE companies SET is_active = true WHERE is_active IS DISTINCT FROM true;

-- 2. SCHOOLS : activer la lecture publique + rendre toutes les entrées actives
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schools are viewable by everyone" ON schools;
CREATE POLICY "Schools are viewable by everyone" ON schools
  FOR SELECT USING (true);

-- Rendre tous les établissements existants visibles
UPDATE schools SET is_active = true WHERE is_active IS DISTINCT FROM true;

-- 3. ADVICE CATEGORIES : lecture publique
ALTER TABLE advice_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advice categories are viewable by everyone" ON advice_categories;
CREATE POLICY "Advice categories are viewable by everyone" ON advice_categories
  FOR SELECT USING (true);

-- 4. ADVICE ARTICLES : lecture publique + publier tous les articles existants
ALTER TABLE advice_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advice articles are viewable by everyone" ON advice_articles;
CREATE POLICY "Advice articles are viewable by everyone" ON advice_articles
  FOR SELECT USING (true);

-- Publier tous les articles existants
UPDATE advice_articles
SET is_published = true, published_at = COALESCE(published_at, NOW())
WHERE is_published IS DISTINCT FROM true;

-- 5. BLOG CATEGORIES : lecture publique
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blog categories are viewable by everyone" ON blog_categories;
CREATE POLICY "Blog categories are viewable by everyone" ON blog_categories
  FOR SELECT USING (true);

-- 6. BLOG POSTS : lecture publique + publier tous les posts existants
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blog posts are viewable by everyone" ON blog_posts;
CREATE POLICY "Blog posts are viewable by everyone" ON blog_posts
  FOR SELECT USING (true);

-- Publier tous les posts existants
UPDATE blog_posts
SET is_published = true, published_at = COALESCE(published_at, NOW())
WHERE is_published IS DISTINCT FROM true;
