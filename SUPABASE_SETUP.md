# Configuration Supabase pour SoussMassa-RH

Guide complet pour configurer Supabase en production pour votre projet d'emploi.

## 🚀 Étape 1 : Configuration du Projet Supabase

### 1.1 Créer le Projet sur Supabase

1. **Connectez-vous à votre compte Supabase**
   - Allez sur [supabase.com](https://supabase.com)
   - Cliquez sur "Sign in" et connectez-vous

2. **Créer un nouveau projet**
   - Cliquez sur "New project"
   - **Nom du projet** : `soussmassa-rh`
   - **Region** : `Europe (Paris)` ou `Europe (Frankfurt)`
   - **Database Password** : Créez un mot de passe sécurisé (enregistrez-le !)
   - Cliquez sur "Create new project"

### 1.2 Récupérer les Clés d'API

Une fois le projet créé, allez dans **Settings > API** et notez :

- **Project URL** : `https://[PROJECT_ID].supabase.co`
- **Public anon key** : `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...`
- **Service role key** : `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` (garder secret !)

## 🗄️ Étape 2 : Configuration de la Base de Données

### 2.1 Créer les Tables

Allez dans **Table Editor** et créez ces tables :

#### Table `job_offers`
```sql
CREATE TABLE job_offers (
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
```

#### Table `users`
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

#### Table `applications`
```sql
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_offer_id INTEGER REFERENCES job_offers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_offer_id)
);
```

### 2.2 Créer les Policies (Rôles)

Allez dans **Authentication > Policies** et créez :

#### Pour `job_offers` :
```sql
-- Lire toutes les offres
CREATE POLICY "Read all offers" ON job_offers
FOR SELECT USING (true);

-- Seulement l'admin peut insérer/modifier
CREATE POLICY "Admin can manage offers" ON job_offers
FOR ALL TO service_role USING (true);
```

#### Pour `users` :
```sql
-- Chaque utilisateur voit seulement ses données
CREATE POLICY "Users can read own data" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
FOR UPDATE USING (auth.uid() = id);
```

#### Pour `applications` :
```sql
-- Lire ses propres candidatures
CREATE POLICY "Users can read own applications" ON applications
FOR SELECT USING (auth.uid() = user_id);

-- Créer/modifier ses propres candidatures
CREATE POLICY "Users can manage own applications" ON applications
FOR ALL USING (auth.uid() = user_id);
```

## 🔐 Étape 3 : Configuration de l'Authentification

### 3.1 Activer l'Authentification Email

Allez dans **Authentication > Settings** :

- **Enable Email Sign up** : ✅ ON
- **Enable Email Confirmations** : ✅ ON
- **Allowed redirect URLs** : `http://localhost:5173, https://votre-domaine.com`
- **Site URL** : `http://localhost:5173` (développement)

### 3.2 Configurer les Providers Sociaux (Optionnel)

Dans **External OAuth Providers** :
- Activez Google, GitHub si vous voulez
- Configurez les clés d'API selon vos besoins

## ☁️ Étape 4 : Configuration du Storage

### 4.1 Créer un Bucket pour les CV

Allez dans **Storage > buckets** :

1. **Créer un bucket** : `cvs`
2. **Public** : ✅ ON (pour accéder aux fichiers)
3. **File size limit** : `5MB`

### 4.2 Policies pour le Storage

Dans **Storage > Policies**, créez :

```sql
-- Lire les CVs (public)
CREATE POLICY "Public can read CVs" ON storage.objects
FOR SELECT USING (bucket_id = 'cvs');

-- Les utilisateurs peuvent uploader leurs CVs
CREATE POLICY "Users can upload CVs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cvs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Les utilisateurs peuvent mettre à jour leurs CVs
CREATE POLICY "Users can update own CVs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'cvs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 🔄 Étape 5 : Déployer les Edge Functions

### 5.1 Installer l'Interface en Ligne de Commande

```bash
# Installez l'interface Supabase CLI
npm install -g supabase

# Connectez-vous
supabase login
```

### 5.2 Initialiser le Projet Localement

```bash
# Initialisez le projet Supabase
supabase init

# Link au projet existant
supabase link --project-ref VOTRE_PROJECT_REF
```

### 5.3 Déployer la Function CV Parser

```bash
# Allez dans le dossier functions
cd supabase/functions/cv-parser

# Déployez la function
supabase functions deploy cv-parser
```

### 5.4 Configurer les Variables d'Environnement

Dans **Settings > Config**, ajoutez :

```
GEMINI_API_KEY=VOTRE_CLE_GEMINI
SUPABASE_URL=VOTRE_PROJECT_URL
SUPABASE_ANON_KEY=VOTRE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=VOTRE_SERVICE_ROLE_KEY
```

## ⚙️ Étape 6 : Configuration Frontend

### 6.1 Mettre à Jour les Variables d'Environnement

Créez un fichier `.env.production` :

```env
VITE_SUPABASE_URL=VOTRE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
```

### 6.2 Mettre à Jour le Fichier de Configuration

Dans `src/services/supabase.ts`, assurez-vous d'avoir :

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## 🚀 Étape 7 : Déploiement en Production

### 7.1 Build du Frontend

```bash
# Installez les dépendances
npm install

# Build pour la production
npm run build
```

### 7.2 Déployer sur Vercel (Recommandé)

1. **Connectez votre repo GitHub à Vercel**
2. **Nouveau projet > Import Git Repository**
3. **Configuration du build** :
   - **Framework Preset** : `Vite`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
   - **Install Command** : `npm install`

4. **Environment Variables** :
   ```
   VITE_SUPABASE_URL=VOTRE_PROJECT_URL
   VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
   ```

### 7.3 Déployer sur Netlify

1. **Connectez votre repo**
2. **Site settings > Build & deploy** :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`

3. **Environment variables** : Ajoutez les mêmes variables

## 🔍 Étape 8 : Vérification et Tests

### 8.1 Tester l'Authentification

```javascript
// Testez dans la console du navigateur
import { supabase } from './src/services/supabase';

// Inscription
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
});

// Connexion
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
});
```

### 8.2 Tester les Données

```javascript
// Testez l'accès aux offres
const { data, error } = await supabase
  .from('job_offers')
  .select('*')
  .limit(5);

console.log(data);
```

### 8.3 Tester le Storage

```javascript
// Testez l'upload de CV
const file = new File(['CV content'], 'cv.pdf', { type: 'application/pdf' });
const { data, error } = await supabase.storage
  .from('cvs')
  .upload(`${userId}/cv.pdf`, file);
```

## 📊 Étape 9 : Monitoring et Maintenance

### 9.1 Monitoring

- **Allez dans Dashboard > Logs** pour surveiller l'activité
- **Dashboard > Usage** pour suivre l'utilisation

### 9.2 Backups

- **Dashboard > Backups** pour configurer les sauvegardes automatiques
- Supabase propose des backups quotidiens automatiques

### 9.3 Sécurité

- **Dashboard > Security** pour surveiller les accès
- Activez **2FA** pour les administrateurs

## 🆘 Résolution des Problèmes Courants

### Problème : Erreur d'authentification
```javascript
// Vérifiez que les clés sont correctes
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### Problème : Storage inaccessible
```javascript
// Vérifiez les policies
// Assurez-vous que le bucket est public
// Vérifiez que l'utilisateur est authentifié
```

### Problème : Edge Function ne répond pas
```bash
# Vérifiez le status de la function
supabase functions list

# Redéployez si nécessaire
supabase functions deploy cv-parser
```

## 📞 Support

- **Documentation Supabase** : https://supabase.com/docs
- **Community Discord** : https://supabase.com/discord
- **GitHub Issues** : https://github.com/supabase/supabase/issues

---

✅ **Votre projet SoussMassa-RH est maintenant configuré en production avec Supabase !**

Vous avez :
- ✅ Base de données sécurisée avec policies
- ✅ Authentification email fonctionnelle
- ✅ Storage pour les CVs
- ✅ Edge Function pour l'analyse de CVs
- ✅ Frontend configuré et prêt pour la production