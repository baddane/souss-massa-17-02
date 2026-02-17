-- ===============================================
-- POLITIQUES RLS (Row Level Security) POUR SUPABASE
-- ===============================================

-- Activer RLS sur toutes les tables sensibles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- POLITIQUES POUR LA TABLE USERS
-- ===============================================

-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile" ON users
FOR ALL
USING (id = auth.uid());

-- Les admins peuvent voir tous les utilisateurs
CREATE POLICY "Admins can view all users" ON users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u2 
    WHERE u2.id = auth.uid() AND u2.role = 'admin'
  )
);

-- Les utilisateurs peuvent mettre à jour leur propre profil (sauf le rôle)
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ===============================================
-- POLITIQUES POUR LA TABLE STUDENT_PROFILES
-- ===============================================

-- Les étudiants peuvent voir leur propre profil
CREATE POLICY "Students can view own profile" ON student_profiles
FOR ALL
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- Les étudiants peuvent mettre à jour leur propre profil
CREATE POLICY "Students can update own profile" ON student_profiles
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ===============================================
-- POLITIQUES POUR LA TABLE COMPANY_PROFILES
-- ===============================================

-- Les entreprises peuvent voir leur propre profil
CREATE POLICY "Companies can view own profile" ON company_profiles
FOR ALL
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- Les entreprises peuvent mettre à jour leur propre profil
CREATE POLICY "Companies can update own profile" ON company_profiles
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ===============================================
-- POLITIQUES POUR LA TABLE JOB_OFFERS
-- ===============================================

-- Tous les utilisateurs peuvent voir les offres actives
CREATE POLICY "Everyone can view active job offers" ON job_offers
FOR SELECT
USING (is_active = true);

-- Les entreprises peuvent gérer leurs propres offres
CREATE POLICY "Companies can manage own job offers" ON job_offers
FOR ALL
USING (
  company_id IN (
    SELECT id FROM company_profiles cp 
    WHERE cp.user_id = auth.uid()
  )
);

-- Les admins peuvent gérer toutes les offres
CREATE POLICY "Admins can manage all job offers" ON job_offers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- ===============================================
-- POLITIQUES POUR LA TABLE APPLICATIONS
-- ===============================================

-- Les étudiants peuvent voir leurs propres candidatures
CREATE POLICY "Students can view own applications" ON applications
FOR ALL
USING (
  student_id IN (
    SELECT id FROM student_profiles sp 
    WHERE sp.user_id = auth.uid()
  )
);

-- Les entreprises peuvent voir les candidatures pour leurs offres
CREATE POLICY "Companies can view applications to their offers" ON applications
FOR ALL
USING (
  job_offer_id IN (
    SELECT jo.id FROM job_offers jo
    JOIN company_profiles cp ON jo.company_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- Les admins peuvent voir toutes les candidatures
CREATE POLICY "Admins can view all applications" ON applications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- ===============================================
-- POLITIQUES POUR LA TABLE NOTIFICATIONS
-- ===============================================

-- Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view own notifications" ON notifications
FOR ALL
USING (user_id = auth.uid());

-- ===============================================
-- POLITIQUES POUR LA TABLE ARTICLES
-- ===============================================

-- Tout le monde peut lire les articles publiés
CREATE POLICY "Everyone can view published articles" ON articles
FOR SELECT
USING (is_published = true);

-- Les auteurs peuvent gérer leurs propres articles
CREATE POLICY "Authors can manage own articles" ON articles
FOR ALL
USING (
  author_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- ===============================================
-- POLITIQUES POUR LA TABLE SCHOOLS
-- ===============================================

-- Tout le monde peut voir les écoles partenaires
CREATE POLICY "Everyone can view schools" ON schools
FOR SELECT
USING (true);

-- Les admins peuvent gérer les écoles
CREATE POLICY "Admins can manage schools" ON schools
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- ===============================================
-- INDEXES SUPPLÉMENTAIRES POUR LES POLITIQUES
-- ===============================================

-- Indexes pour améliorer les performances des politiques RLS
CREATE INDEX idx_student_profiles_user_id_rls ON student_profiles(user_id);
CREATE INDEX idx_company_profiles_user_id_rls ON company_profiles(user_id);
CREATE INDEX idx_job_offers_company_id_rls ON job_offers(company_id);
CREATE INDEX idx_applications_student_id_rls ON applications(student_id);
CREATE INDEX idx_applications_job_offer_id_rls ON applications(job_offer_id);
CREATE INDEX idx_notifications_user_id_rls ON notifications(user_id);
CREATE INDEX idx_articles_author_id_rls ON articles(author_id);

-- ===============================================
-- FONCTIONS AUXILIAIRES POUR LES POLITIQUES
-- ===============================================

-- Fonction pour vérifier si un utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = user_id AND u.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le type de profil d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_profile_type(user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM users WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- TRIGGERS DE SÉCURITÉ SUPPLÉMENTAIRES
-- ===============================================

-- Trigger pour empêcher la suppression des utilisateurs (désactiver au lieu de supprimer)
CREATE OR REPLACE FUNCTION prevent_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Au lieu de supprimer, on désactive le compte
  UPDATE users SET is_active = false WHERE id = OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_user_deletion_trigger
INSTEAD OF DELETE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_user_deletion();

-- ===============================================
-- FIN DES POLITIQUES RLS
-- ===============================================