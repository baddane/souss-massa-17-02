# CLAUDE.md - Guide pour Claude Code

## Projet SoussMassa-RH

Site de recrutement pour la region Souss-Massa (Maroc).
- **URL** : https://soussmassa-rh.com
- **Stack** : React 18 + TypeScript + Vite, deploye sur Vercel
- **Base de donnees** : Supabase (projet `tqrhxhoqqktnhttzmoqt`)
- **Cle anon Supabase** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM`

## Schema de la table `job_offers`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (auto) | Identifiant unique |
| `created_at` | timestamp (auto) | Date de creation |
| `ville` | text | Ville du poste (ex: Agadir, Inezgane, Taroudant, Tiznit) |
| `ref_offre` | text | Reference ANAPEC de l'offre (ex: AG170225001234) |
| `type_contrat` | text | Type de contrat : CDI, CDD, Stage, Alternance, Freelance |
| `raison_sociale` | text | Nom de l'entreprise |
| `date_offre` | date | Date de publication de l'offre (format YYYY-MM-DD) |
| `nbre_postes` | integer | Nombre de postes disponibles |
| `emploi_metier` | text | Intitule du poste (ex: Developpeur Web, Comptable) |
| `full_description` | text | Description complete du poste (2 paragraphes minimum) |
| `seo_keywords` | text[] | Mots-cles SEO (array PostgreSQL) |
| `meta_description` | text | Meta description pour le SEO (max 160 caracteres) |
| `suggested_salary_range` | text | Fourchette salariale suggeree (ex: 5000-8000 MAD) |
| `required_skills` | text[] | Competences requises (array PostgreSQL) |
| `source` | text | Source de l'offre (ex: ANAPEC, Direct) |
| `slug` | text (unique) | Slug SEO pour l'URL permanente |

## Ajout d'offres d'emploi - Procedure complete

Quand l'utilisateur fournit des offres (Excel, PDF, screenshot, texte), suivre ces etapes :

### 1. Extraction des donnees

Extraire de chaque offre : `ville`, `ref_offre`, `type_contrat`, `raison_sociale`, `date_offre`, `nbre_postes`, `emploi_metier`.

Si certaines infos manquent :
- `type_contrat` : mettre "CDI" par defaut
- `nbre_postes` : mettre 1 par defaut
- `date_offre` : mettre la date du jour
- `source` : mettre "ANAPEC" si ref_offre commence par 2 lettres + chiffres

### 2. Generation du slug SEO

Le slug doit etre unique et au format : `{poste}-{ville}[-{entreprise}]`

```
Regles :
- Tout en minuscules, sans accents
- Remplacer les espaces et caracteres speciaux par des tirets
- Si doublon, ajouter le nom de l'entreprise
- Si encore doublon, ajouter un suffixe numerique (-2, -3...)
```

Exemples :
- "Developpeur Web" a "Agadir" → `developpeur-web-agadir`
- Doublon → `developpeur-web-agadir-sarl-xyz`
- Encore doublon → `developpeur-web-agadir-sarl-xyz-2`

Utiliser la fonction `slugify` de `components/SEO.tsx` :
```typescript
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
```

### 3. Enrichissement SEO (obligatoire pour chaque offre)

#### full_description
Rediger 2 paragraphes minimum en francais :
- Paragraphe 1 : description du poste, missions principales, contexte de l'entreprise
- Paragraphe 2 : profil recherche, competences, avantages

Format structure recommande :
```
Missions principales :
- Mission 1
- Mission 2
- Mission 3

Profil recherche :
- Competence 1
- Competence 2

Avantages :
- Avantage 1
```

#### meta_description
- Maximum 160 caracteres
- Format : "{Poste} a {Ville} - {Type contrat} chez {Entreprise}. {1 phrase sur le poste}."
- Exemple : "Developpeur Web a Agadir - CDI chez SARL XYZ. Rejoignez une equipe dynamique dans le secteur digital."

#### seo_keywords
Array de 5-10 mots-cles pertinents :
```json
["emploi agadir", "developpeur web maroc", "cdi agadir", "recrutement souss-massa", "informatique agadir"]
```
Toujours inclure : "emploi {ville}", "recrutement souss-massa", "{poste} maroc"

#### required_skills
Array de competences specifiques au poste :
```json
["JavaScript", "React", "Node.js", "Git", "SQL"]
```

#### suggested_salary_range
Si non fourni, estimer en fonction du poste et du marche marocain :
- Debutant : "3000-5000 MAD"
- Junior : "5000-8000 MAD"
- Confirme : "8000-15000 MAD"
- Senior/Manager : "15000-25000 MAD"

### 4. Insertion dans Supabase

Utiliser l'API Supabase pour inserer :

```typescript
import { supabaseOffers } from './src/services/supabase';

const { data, error } = await supabaseOffers
  .from('job_offers')
  .insert([
    {
      ville: "Agadir",
      ref_offre: "AG170225001234",
      type_contrat: "CDI",
      raison_sociale: "SARL XYZ",
      date_offre: "2026-06-21",
      nbre_postes: 2,
      emploi_metier: "Developpeur Web",
      full_description: "...",
      seo_keywords: ["emploi agadir", "developpeur web maroc"],
      meta_description: "Developpeur Web a Agadir - CDI chez SARL XYZ...",
      suggested_salary_range: "8000-15000 MAD",
      required_skills: ["JavaScript", "React", "Node.js"],
      source: "ANAPEC",
      slug: "developpeur-web-agadir"
    }
  ]);
```

On peut aussi inserer via l'API REST Supabase directement :
```bash
curl -X POST "https://tqrhxhoqqktnhttzmoqt.supabase.co/rest/v1/job_offers" \
  -H "apikey: SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '[{ ... }]'
```

### 5. Verification apres insertion

- Verifier que le slug est accessible : `https://soussmassa-rh.com/emploi/{slug}`
- La sitemap se met a jour automatiquement (Edge Function `/api/sitemap`)
- Le JSON-LD JobPosting est genere automatiquement par `components/SEO.tsx`

## Structure des fichiers cles

```
api/
  sitemap.ts        # Edge Function - sitemap dynamique (lit job_offers depuis Supabase)
  robots.ts         # Edge Function - robots.txt
  apply.ts          # Serverless function - envoi candidature par email

components/
  SEO.tsx           # Composant SEO + generateJobPostingJsonLd + slugify
  ApplyModal.tsx    # Modal de candidature avec upload CV
  Header.tsx        # Navigation

pages/
  Home.tsx          # Page d'accueil
  Offers.tsx        # Liste des offres
  JobDetail.tsx     # Detail d'une offre (route /emploi/:slug)
  Contact.tsx       # Formulaire de contact
  Admin.tsx         # Dashboard admin (candidatures + messages)

services/
  supabase.ts       # Client Supabase
  jobOffersService.ts  # CRUD offres d'emploi
```

## SEO - Points critiques

1. **Slug unique** : chaque offre a un permalink `/emploi/{slug}` indexe par Google
2. **JSON-LD JobPosting** : schema structure genere automatiquement sur chaque page d'offre
3. **Sitemap dynamique** : `/sitemap.xml` (Edge Function) inclut toutes les offres automatiquement
4. **Meta tags** : title, description, Open Graph, Twitter Card via composant SEO
5. **Canonical URL** : toujours `https://soussmassa-rh.com/emploi/{slug}`

## Commandes utiles

```bash
npm run dev          # Serveur de developpement
npm run build        # Build production
npm run preview      # Preview du build
```

## Regles importantes

- Ne jamais supprimer les offres existantes sauf demande explicite
- Toujours verifier les doublons par `ref_offre` ou `slug` avant insertion
- Les arrays PostgreSQL (`seo_keywords`, `required_skills`) s'inserent comme des arrays JSON normaux
- Le site est un SPA : toutes les routes passent par `index.html` (voir `vercel.json`)
- Pas de systeme de login : l'admin est protege par un simple mot de passe cote client
