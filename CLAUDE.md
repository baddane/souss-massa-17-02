# CLAUDE.md - Guide pour Claude Code

## Projet SoussMassa-RH

Site de recrutement pour la region Souss-Massa (Maroc).
- **URL** : https://soussmassa-rh.com
- **Stack** : React 18 + TypeScript + Vite, deploye sur Vercel
- **Base de donnees** : Supabase (projet `tqrhxhoqqktnhttzmoqt`)
- **Cle anon Supabase** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmh4aG9xcWt0bmh0dHptb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzgwNDcsImV4cCI6MjA4NjUxNDA0N30.hkxJ6XW6CGkAnAaXYabr049eiiEnOYpuinMoHf-TkfM`
- **Vercel** : projet `prj_uSQQIt2HJzVYgnG7fABwbJqIRrLh`, team `team_BjXqSEKNwzykObdXJyuMGgjj`
- **Deploiement** : auto depuis branche `main` sur GitHub (`baddane/souss-massa-17-02`)

## Schema de la table `job_offers`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (auto) | Identifiant unique |
| `created_at` | timestamp (auto) | Date de creation |
| `ville` | text | Ville du poste (ex: Agadir, Inezgane, Taroudant, Tiznit) |
| `ref_offre` | text | Reference ANAPEC de l'offre (ex: AG170225001234) ou reference directe (DIR-DDMMYY-XX-NNN) |
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
- `source` : mettre "ANAPEC" si ref_offre commence par 2 lettres + chiffres, sinon "Direct"

Pour les fichiers Excel ANAPEC :
- Les donnees sont dans Sheet2, Sheet1 contient juste le resume
- Colonnes : Agence, Nom Employe, Ref Offre, Type Contrat, Raison Sociale, Date Offre, Etat Offre, Niveau Service, Nbre Postes, Emploi Metier
- **Filtrer les offres "En cours" uniquement** (ignorer "Suspendu" et "Conclu")
- La date peut etre un numero de serie Excel : extraire la date depuis la ref_offre (format AGDDMMYY...) qui est plus fiable
- Mapper les types de contrat : CI → CDD, CI_ND → CDD, Choix Multiple → CDI
- La ville s'extrait du nom de l'agence (AGADIR → Agadir, INEZGANE AIT MELLOUL → Inezgane)

Pour les demandes directes (email/texte d'une entreprise) :
- `ref_offre` : generer au format `DIR-DDMMYY-XX-NNN` (XX = initiales entreprise)
- `source` : "Direct"

### 2. Verification des doublons

**Avant toute insertion**, recuperer les `ref_offre` et `slug` existants dans Supabase :
```javascript
fetch(SUPABASE_URL + '/rest/v1/job_offers?select=ref_offre,slug', {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
})
```
Ne jamais inserer une offre dont le `ref_offre` existe deja.

### 3. Generation du slug SEO

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

### 4. Enrichissement SEO (obligatoire pour chaque offre)

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
- Debutant / ouvrier : "2800-4000 MAD"
- Junior / employe : "3500-5000 MAD"
- Confirme : "5000-8000 MAD"
- Qualifie : "8000-15000 MAD"
- Senior/Manager : "15000-25000 MAD"

### 5. Insertion dans Supabase

Inserer via l'API REST Supabase avec fetch (methode recommandee dans les scripts Node.js) :
```javascript
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const res = await fetch(SUPABASE_URL + '/rest/v1/job_offers', {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify([
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
  ])
});
```

### 6. Mise a jour de la sitemap statique

Apres chaque insertion, regenerer `public/sitemap.xml` depuis Supabase :
```javascript
const res = await fetch(SUPABASE_URL + '/rest/v1/job_offers?select=slug,date_offre&order=date_offre.desc', {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
});
const offers = await res.json();
// Generer le XML avec les 3 pages statiques + toutes les offres
// Ecrire dans public/sitemap.xml
```
Puis commiter et pousser le fichier `public/sitemap.xml` sur main.

### 7. Verification apres insertion

- Verifier que le slug est accessible : `https://soussmassa-rh.com/emploi/{slug}`
- La sitemap dynamique se met a jour automatiquement (Edge Function `/api/sitemap`)
- Le JSON-LD JobPosting est genere automatiquement par `components/SEO.tsx`

## Categories et recherche

La page d'accueil a 8 categories qui mappent vers des recherches elargies dans `jobOffersService.ts`.
Quand un mot-cle correspond a une categorie, la recherche s'elargit a tous les metiers associes :

| Categorie | Mot-cle | Metiers inclus |
|-----------|---------|---------------|
| Informatique & IT | `informatique` | developpeur, technicien R&D, operateur de saisie, teleconseiller, electronique |
| Commerce & Vente | `commercial` | commercial, vendeur, caissier, representant, attache commercial, libre service, produits frais |
| Administration | `administratif` | gestion administrative, comptable, aide comptable, secretaire, employe de bureau, standardiste, services financiers, banque, souscripteur, accueil |
| Industrie | `industrie` | operateur, production, maintenance, mecanicien, menuisier, magasinier, conducteur, controleur, aquaculteur, agricole |
| Sante | `sante` | infirmier, aide soignant, pharmacie, estheticien |
| Education | `enseignement` | formateur, enseignant |
| Tourisme & Hotellerie | `tourisme` | cuisinier, serveur, barman, chef de partie, commis, etage, menage, femme de menage, poissonnier, chauffeur touristique, restauration, reception + raison_sociale contenant hotel/balneaire |
| BTP & Construction | `construction` | batiment, dessinateur, electricien, geologue, conducteur travaux, cadre technique |

Pour ajouter de nouveaux metiers a une categorie, modifier `CATEGORY_FILTERS` dans `src/services/jobOffersService.ts`.

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
  Home.tsx          # Page d'accueil (categories, recherche, offres recentes)
  Offers.tsx        # Liste des offres avec filtres (recherche, ville, contrat)
  JobDetail.tsx     # Detail d'une offre (route /emploi/:slug)
  Contact.tsx       # Formulaire de contact (stocke dans table `messages`)
  Admin.tsx         # Dashboard admin (candidatures + messages, mot de passe: souss2026)

services/
  supabase.ts       # Client Supabase (2 instances: supabaseOffers + supabaseSite)
  jobOffersService.ts  # CRUD offres + recherche par categories (CATEGORY_FILTERS)

constants.ts        # Liste des villes (CITIES)
```

## SEO - Points critiques

1. **Slug unique** : chaque offre a un permalink `/emploi/{slug}` indexe par Google
2. **JSON-LD JobPosting** : schema structure genere automatiquement sur chaque page d'offre
3. **Sitemap dynamique** : `/sitemap.xml` (Edge Function) inclut toutes les offres automatiquement
4. **Sitemap statique** : `public/sitemap.xml` sert de fallback et doit etre mis a jour apres chaque ajout d'offres
5. **Meta tags** : title, description, Open Graph, Twitter Card via composant SEO
6. **Canonical URL** : toujours `https://soussmassa-rh.com/emploi/{slug}`
7. **Categories** : les mots-cles de categorie (`tourisme`, `commercial`, etc.) affichent un titre SEO propre au lieu du mot-cle brut

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
- Pour les fichiers Excel ANAPEC, installer `xlsx` (`npm install xlsx`) pour parser les fichiers .xls
- Toujours commiter et pousser sur `main` apres modification (deploiement auto Vercel)
- Apres insertion d'offres, toujours mettre a jour `public/sitemap.xml` et commiter
