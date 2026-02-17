-- Supabase Schema for SoussMassa-RH
-- Initial migration script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create job_offers table
CREATE TABLE IF NOT EXISTS job_offers (
  id SERIAL PRIMARY KEY,
  ref_offre VARCHAR(50) UNIQUE NOT NULL,
  emploi_metier VARCHAR(200) NOT NULL,
  raison_sociale VARCHAR(200) NOT NULL,
  ville VARCHAR(100) NOT NULL,
  type_contrat VARCHAR(50) NOT NULL,
  nbre_postes INTEGER DEFAULT 1,
  date_offre DATE DEFAULT CURRENT_DATE,
  full_description TEXT,
  required_skills TEXT[],
  suggested_salary_range VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  cv_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_offer_id INTEGER REFERENCES job_offers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_offer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_offers_ville ON job_offers(ville);
CREATE INDEX IF NOT EXISTS idx_job_offers_type_contrat ON job_offers(type_contrat);
CREATE INDEX IF NOT EXISTS idx_job_offers_date ON job_offers(date_offre);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_offer_id ON applications(job_offer_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_job_offers_updated_at ON job_offers;
CREATE TRIGGER update_job_offers_updated_at 
    BEFORE UPDATE ON job_offers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO job_offers (ref_offre, emploi_metier, raison_sociale, ville, type_contrat, nbre_postes, full_description, required_skills, suggested_salary_range) VALUES
('SM-001', 'Développeur Full Stack', 'Tech Solutions Maroc', 'Agadir', 'CDI', 2, 'Nous recherchons un développeur full stack expérimenté...', ARRAY['JavaScript', 'React', 'Node.js', 'PostgreSQL'], '8000-12000 MAD'),
('SM-002', 'Caissier', 'Supermarché Atlas', 'Marrakech', 'CDD', 3, 'Poste de caissier en CDD...', ARRAY['Service client', 'Caisses'], '4000-5000 MAD'),
('SM-003', 'Infirmier', 'Clinique Al Amal', 'Essaouira', 'CDI', 1, 'Infirmier diplômé pour notre clinique...', ARRAY['Soins infirmiers', 'Premiers secours'], '6000-8000 MAD'),
('SM-004', 'Stagiaire Marketing', 'Agence Digitale', 'Agadir', 'Stage', 1, 'Stage de 6 mois en marketing digital...', ARRAY['Marketing digital', 'SEO', 'Réseaux sociaux'], 'Stipend: 2000 MAD'),
('SM-005', 'Technicien Maintenance', 'Industrie Souss', 'Taroudant', 'CDI', 2, 'Technicien pour maintenance industrielle...', ARRAY['Électricité', 'Mécanique', 'Maintenance'], '5000-7000 MAD'),
('SM-006', 'Alternant Développement', 'Startup Innov', 'Inezgane', 'Alternance', 1, 'Alternance développement web...', ARRAY['HTML', 'CSS', 'JavaScript'], 'Selon grille');