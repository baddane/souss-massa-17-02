# Guide de Configuration Supabase - Étape par Étape

## 🎯 Objectif
Configurer complètement Supabase pour votre projet SoussMassa-RH avec deux bases de données distinctes.

## 📋 Prérequis
- Compte Supabase (https://supabase.com)
- Node.js et npm installés
- Projet React/Vite en cours

## 🔧 Étape 1 : Configuration des Variables d'Environnement

### 1.1 Créer le fichier `.env.local`
```bash
# Copier le modèle
cp .env.example .env.local
```

### 1.2 Remplir les variables d'environnement
Ouvrez `.env.local` et assurez-vous d'avoir ces variables :

```env
# Base de données d'offres d'emploi externe
VITE_SUPABASE_OFFERS_URL=https://tqrhxhoqqktnhttzmoqt.supabase.co
VITE_SUPABASE_OFFERS_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM

# Base de données du site (authentification et données utilisateur)
VITE_SUPABASE_URL=https://dbisyinrrwlbvnnvsycy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaXN5aW5ycndsYnZubnZzeWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTA4ODEsImV4cCI6MjA4NjU2Njg4MX0.1E1HEoENIiswqIO8ZUOK33XXbD29rQ-BhU-dqvFReRA

# Service Role Key (pour Edge Functions uniquement)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaXN5aW5ycndsYnZubnZzeWN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk5MDg4MSwiZXhwIjoyMDg2NTY2ODgxfQ.zKQzGB8rMxibCWOOdewZZdCFS-Y4RE5GX1HDRaJwCkE

# API Key pour Gemini (analyse de CVs)
GEMINI_API_KEY=AIzaSyA95lY5jg1szkBtksUE8pt8fO93KMb4DWA
```

## 🔧 Étape 2 : Configuration des Bases de Données Supabase

### 2.1 Se connecter à Supabase
1. Allez sur https://supabase.com
2. Connectez-vous à votre compte
3. Vous avez déjà 2 projets :
   - **Site Database**: `dbisyinrrwlbvnnvsycy` (pour l'authentification)
   - **Offers Database**: `tqrhxhoqqktnhttzmoqt` (pour les offres d'emploi)

### 2.2 Configurer la Base de Données du Site (Authentification)

#### 2.2.1 Aller dans le projet Site Database
- URL: https://app.supabase.com/project/dbisyinrrwlbvnnvsycy

#### 2.2.2 Configurer l'Authentification
1. **Authentication > Settings**
   - Activez "Email Sign up"
   - Activez "Email Confirmations"
   - **Allowed redirect URLs**: `http://localhost:3001/*`
   - **Site URL**: `http://localhost:3001`

2. **Authentication > Providers**
   - Activez les providers souhaités (Google, GitHub, etc.)

#### 2.2.3 Créer les Tables
1. **Database > Tables**
2. Créez les tables suivantes :

**Table `users`** (extends auth.users):
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  cv_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Table `student_profiles`**:
```sql
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
  skills TEXT[],
  languages TEXT[],
  experience_years INTEGER DEFAULT 0,
  cv_url TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  availability VARCHAR(50),
  work_permit VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Table `company_profiles`**:
```sql
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(200) NOT NULL,
  company_description TEXT,
  company_size VARCHAR(50),
  industry VARCHAR(100),
  website_url TEXT,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(10),
  logo_url TEXT,
  company_type VARCHAR(50),
  founded_year INTEGER,
  linkedin_url TEXT,
  twitter_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Table `applications`**:
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  cover_letter TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_by_company BOOLEAN DEFAULT false
);
```

**Table `notifications`**:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.2.4 Configurer les Security Policies (RLS)
1. **Authentication > Policies**
2. Créez ces policies :

**Pour `users`**:
```sql
-- Chaque utilisateur voit seulement ses données
CREATE POLICY "Users can read own data" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
FOR UPDATE USING (auth.uid() = id);
```

**Pour `student_profiles`**:
```sql
CREATE POLICY "Students can view own profile" ON student_profiles
FOR ALL
USING (user_id = auth.uid());
```

**Pour `company_profiles`**:
```sql
CREATE POLICY "Companies can view own profile" ON company_profiles
FOR ALL
USING (user_id = auth.uid());
```

**Pour `applications`**:
```sql
CREATE POLICY "Students can view own applications" ON applications
FOR ALL
USING (
  student_id IN (
    SELECT id FROM student_profiles sp 
    WHERE sp.user_id = auth.uid()
  )
);
```

#### 2.2.5 Configurer le Storage
1. **Storage > buckets**
2. Créez les buckets :
   - **`cv-files`**: Pour les CVs des étudiants (Public)
   - **`company-logos`**: Pour les logos des entreprises (Public)

3. **Storage > Policies** - Ajoutez les policies :
```sql
-- CV Files
CREATE POLICY "Public can read CVs" ON storage.objects
FOR SELECT USING (bucket_id = 'cv-files');

CREATE POLICY "Users can upload CVs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cv-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Company Logos
CREATE POLICY "Public can read company logos" ON storage.objects
FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Companies can upload logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 2.3 Configurer la Base de Données des Offres (Job Offers)

#### 2.3.1 Aller dans le projet Offers Database
- URL: https://app.supabase.com/project/tqrhxhoqqktnhttzmoqt

#### 2.3.2 Vérifier la Table `job_offers`
La table existe déjà avec les bonnes données. Vérifiez que les colonnes suivantes existent :
- `id`, `ville`, `ref_offre`, `type_contrat`, `raison_sociale`, `date_offre`, `emploi_metier`, `full_description`

#### 2.3.3 Configurer les Security Policies
```sql
-- Tout le monde peut lire les offres
CREATE POLICY "Everyone can view job offers" ON job_offers
FOR SELECT USING (true);

-- Seul le service role peut modifier
CREATE POLICY "Service role can manage offers" ON job_offers
FOR ALL TO service_role USING (true);
```

## 🔧 Étape 3 : Déployer les Edge Functions

### 3.1 Installer Supabase CLI
```bash
npm install -g supabase
```

### 3.2 Se connecter à Supabase
```bash
supabase login
```

### 3.3 Linker le projet
```bash
# Pour le projet Site Database
supabase link --project-ref dbisyinrrwlbvnnvsycy

# Pour le projet Offers Database
supabase link --project-ref tqrhxhoqqktnhttzmoqt
```

### 3.4 Déployer la fonction CV Parser
```bash
# Aller dans le dossier de la fonction
cd supabase/functions/cv-parser

# Déployer la fonction
supabase functions deploy cv-parser
```

### 3.5 Configurer les Variables d'Environnement dans Supabase
Dans le Dashboard Supabase (Site Database) :
1. **Settings > Config**
2. Ajoutez :
   ```
   GEMINI_API_KEY=AIzaSyA95lY5jg1szkBtksUE8pt8fO93KMb4DWA
   SUPABASE_URL=https://dbisyinrrwlbvnnvsycy.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaXN5aW5ycndsYnZubnZzeWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTA4ODEsImV4cCI6MjA4NjU2Njg4MX0.1E1HEoENIiswqIO8ZUOK33XXbD29rQ-BhU-dqvFReRA
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaXN5aW5ycndsYnZubnZzeWN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk5MDg4MSwiZXhwIjoyMDg2NTY2ODgxfQ.zKQzGB8rMxibCWOOdewZZdCFS-Y4RE5GX1HDRaJwCkE
   ```

## 🔧 Étape 4 : Vérification et Tests

### 4.1 Vérifier le fonctionnement
```bash
# Lancer le développement
npm run dev
```

### 4.2 Tester l'authentification
Dans la console du navigateur :
```javascript
import { supabase } from './src/services/supabase';

// Tester la connexion
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
});

console.log(data, error);
```

### 4.3 Tester les offres d'emploi
```javascript
import { supabaseOffers } from './src/services/supabase';

const { data, error } = await supabaseOffers
  .from('job_offers')
  .select('*')
  .limit(5);

console.log(data);
```

### 4.4 Tester le Storage
```javascript
import { supabase } from './src/services/supabase';

// Tester l'upload d'un CV
const file = new File(['CV content'], 'cv.pdf', { type: 'application/pdf' });
const { data, error } = await supabase.storage
  .from('cv-files')
  .upload('user123/cv.pdf', file);

console.log(data, error);
```

## 🔧 Étape 5 : Déploiement en Production

### 5.1 Variables d'Environnement Production
Dans votre hébergeur (Vercel, Netlify, etc.), ajoutez les mêmes variables d'environnement que dans `.env.local`.

### 5.2 Vérifier les URLs de redirection
Dans Supabase Dashboard > Authentication > Settings :
- **Allowed redirect URLs**: Votre URL de production (ex: `https://votre-site.com/*`)
- **Site URL**: Votre URL de production

### 5.3 Tester en production
- Vérifiez que l'authentification fonctionne
- Vérifiez que les offres d'emploi s'affichent
- Vérifiez que l'upload de fichiers fonctionne

## 🚨 Résolution des Problèmes Courants

### Problème : Erreur d'authentification
```javascript
// Vérifiez que les clés sont correctes
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### Problème : Storage inaccessible
- Vérifiez que les buckets existent
- Vérifiez que les policies sont correctes
- Vérifiez que l'utilisateur est authentifié

### Problème : Edge Function ne répond pas
```bash
# Vérifiez le status
supabase functions list

# Redéployez si nécessaire
supabase functions deploy cv-parser
```

## 📞 Support et Documentation

- **Documentation Supabase**: https://supabase.com/docs
- **Community Discord**: https://supabase.com/discord
- **GitHub Issues**: https://github.com/supabase/supabase/issues

---

✅ **Votre configuration Supabase est maintenant complète et fonctionnelle !**

Vous avez :
- ✅ Deux bases de données distinctes et sécurisées
- ✅ Authentification complète avec email
- ✅ Storage pour les fichiers (CVs, logos)
- ✅ Edge Functions pour l'analyse de CVs
- ✅ Security Policies pour la protection des données
- ✅ Configuration prête pour la production