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

### Contraintes base de donnees

- **`date_offre_iso_format`** : contrainte CHECK qui impose le format `YYYY-MM-DD` (regex `^\d{4}-\d{2}-\d{2}$`). Toute insertion avec un autre format (DD/MM/YYYY, timestamp, etc.) sera **rejetee par la base**.

## Ajout d'offres d'emploi - Procedure complete

Quand l'utilisateur fournit des offres (Excel, PDF, screenshot, texte), suivre ces etapes :

### 1. Extraction des donnees

Extraire de chaque offre : `ville`, `ref_offre`, `type_contrat`, `raison_sociale`, `date_offre`, `nbre_postes`, `emploi_metier`.

Si certaines infos manquent :
- `type_contrat` : mettre "CDI" par defaut
- `nbre_postes` : mettre 1 par defaut
- `date_offre` : mettre la date du jour au format YYYY-MM-DD
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

### 2. VALIDATION OBLIGATOIRE DU FORMAT DE DATE

**CRITIQUE** : `date_offre` doit TOUJOURS etre au format `YYYY-MM-DD` (ex: `2026-06-21`).

La base de donnees a une contrainte CHECK `date_offre_iso_format` qui **rejettera** toute insertion au format `DD/MM/YYYY`, `MM/DD/YYYY`, ou autre.

Avant d'inserer, toujours normaliser la date avec cette logique :
```javascript
function normalizeDate(raw) {
  // Format YYYY-MM-DD : deja bon
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Format DD/MM/YYYY : inverser
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  // Format timestamp ISO : extraire la date
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.split('T')[0];
  // Numero de serie Excel : NE PAS UTILISER, extraire la date depuis ref_offre
  // Fallback : date du jour
  return new Date().toISOString().split('T')[0];
}
```

Sources de dates a risque :
- **Excel** : les numeros de serie (46028, etc.) donnent des dates fausses. Toujours extraire depuis `ref_offre` (format AGDDMMYY...)
- **Texte/email** : souvent en DD/MM/YYYY, toujours convertir
- **Scraping ANAPEC** : peut etre DD/MM/YYYY ou DD-MM-YYYY, toujours normaliser

### 3. Verification des doublons

**Avant toute insertion**, recuperer les `ref_offre` et `slug` existants dans Supabase :
```javascript
fetch(SUPABASE_URL + '/rest/v1/job_offers?select=ref_offre,slug', {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
})
```
Ne jamais inserer une offre dont le `ref_offre` existe deja.

### 4. Generation du slug SEO

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

### 5. Enrichissement SEO (obligatoire pour chaque offre)

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

### 6. Insertion dans Supabase

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
      date_offre: "2026-06-21",   // TOUJOURS format YYYY-MM-DD
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

### 7. Mise a jour de la sitemap statique

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

### 8. Verification apres insertion

- Verifier que le slug est accessible : `https://soussmassa-rh.com/emploi/{slug}`
- La sitemap dynamique se met a jour automatiquement (Edge Function `/api/sitemap`)
- Le JSON-LD JobPosting est genere automatiquement par `components/SEO.tsx`
- Verifier que les dates sont au format YYYY-MM-DD dans la base (pas de DD/MM/YYYY)

## Filtrage et recherche

### Filtres sur la page Offres (`/offres`)

La page Offres a 4 filtres :
1. **Barre de recherche** (`q`) : recherche libre dans `emploi_metier` et `raison_sociale`
2. **Ville** (`city`) : filtre exact sur `ville`
3. **Type de contrat** (`contractType`) : filtre exact sur `type_contrat`
4. **Secteur d'activite** (`sector`) : declenche l'expansion CATEGORY_FILTERS

Les filtres sont combinables (ex: secteur "tourisme" + ville "Agadir").

### Parametres URL

| Parametre | Exemple | Description |
|-----------|---------|-------------|
| `q` | `/offres?q=comptable` | Recherche textuelle libre |
| `city` | `/offres?city=Agadir` | Filtre par ville |
| `sector` | `/offres?sector=tourisme` | Filtre par secteur (expansion CATEGORY_FILTERS) |
| `contractType` | `/offres?contractType=CDI` | Filtre par type de contrat |
| `jobTitle` | `/offres?jobTitle=developpeur` | Filtre par intitule de poste |

### Categories et expansion (CATEGORY_FILTERS)

Les categories de la page d'accueil linkent vers `/offres?sector={mot-cle}`.
Le filtre `sector` est gere separement de la recherche textuelle dans le service :

**IMPORTANT** : CATEGORY_FILTERS existe dans DEUX fichiers (les deux doivent rester synchronises) :
- `services/jobOffersService.ts` — utilise par les pages (import depuis `pages/`)
- `src/services/jobOffersService.ts` — copie alternative

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

Pour ajouter de nouveaux metiers a une categorie, modifier `CATEGORY_FILTERS` dans **les deux fichiers** `services/jobOffersService.ts` et `src/services/jobOffersService.ts`.

## SEO - Configuration complete

### Protection de la page admin (triple couche)

1. **robots.txt** (`api/robots.ts` + `public/robots.txt`) : `Disallow: /admin` et `Disallow: /api/`
2. **vercel.json** : header `X-Robots-Tag: noindex, nofollow` sur `/admin` et `/api/`
3. **React Helmet** : `<meta name="robots" content="noindex, nofollow" />` dans `pages/Admin.tsx`

### Sitemap

- **Dynamique** : `/api/sitemap.ts` (Edge Function) genere le sitemap depuis Supabase
  - Pages statiques : `/` (1.0), `/offres` (0.9), `/contact` (0.5)
  - Pages secteur : `/offres?sector=informatique` etc. (0.7)
  - Pages ville : `/offres?city=Agadir` etc. (0.7)
  - Pages offres : `/emploi/{slug}` (0.8)
  - Validation des dates : fonction `toISODate()` normalise toutes les dates en YYYY-MM-DD
- **Statique** : `public/sitemap.xml` sert de fallback, doit etre mis a jour apres chaque ajout d'offres

### Page 404

- `pages/NotFound.tsx` : page 404 propre avec liens de retour (au lieu d'un redirect)
- Marquee `noindex, nofollow` via Helmet

### Maillage interne (Footer)

Le footer (`components/Footer.tsx`) a 4 colonnes :
1. **Marque** : logo + description
2. **Par secteur** : 8 liens vers `/offres?sector=...`
3. **Par ville** : 5 liens vers `/offres?city=...`
4. **Navigation** : accueil, offres, contact

### Points critiques SEO

1. **Slug unique** : chaque offre a un permalink `/emploi/{slug}` indexe par Google
2. **JSON-LD JobPosting** : schema structure genere automatiquement sur chaque page d'offre
3. **Meta tags** : title, description, Open Graph, Twitter Card via composant SEO
4. **Canonical URL** : toujours `https://soussmassa-rh.com/emploi/{slug}`
5. **Dates lastmod** : toujours au format `YYYY-MM-DD` dans le sitemap (contrainte DB + validation JS)

### Headers Vercel (vercel.json)

- `X-Robots-Tag: noindex, nofollow` sur `/admin` et `/api/`
- Cache immutable sur fichiers JS et CSS statiques
- Rewrites : `/sitemap.xml` → `/api/sitemap`, `/robots.txt` → `/api/robots`, `/*` → `/index.html`

## Structure des fichiers cles

```
api/
  sitemap.ts        # Edge Function - sitemap dynamique (lit job_offers depuis Supabase)
  robots.ts         # Edge Function - robots.txt (bloque /admin et /api/)
  apply.ts          # Serverless function - envoi candidature par email

components/
  SEO.tsx           # Composant SEO + generateJobPostingJsonLd + slugify
  ApplyModal.tsx    # Modal de candidature avec upload CV
  Header.tsx        # Navigation
  Footer.tsx        # Footer 4 colonnes (secteurs, villes, navigation)

pages/
  Home.tsx          # Page d'accueil (categories linkent vers ?sector=, recherche, offres recentes)
  Offers.tsx        # Liste des offres avec 4 filtres (recherche, ville, contrat, secteur)
  JobDetail.tsx     # Detail d'une offre (route /emploi/:slug)
  Contact.tsx       # Formulaire de contact (stocke dans table `messages`)
  Admin.tsx         # Dashboard admin (candidatures + messages, mot de passe: souss2026, noindex)
  NotFound.tsx      # Page 404 (noindex)

services/
  jobOffersService.ts  # CRUD offres + recherche par secteur (CATEGORY_FILTERS) — FICHIER PRINCIPAL
src/services/
  jobOffersService.ts  # Copie alternative — DOIT RESTER SYNCHRONISE avec services/

constants.ts        # Liste des villes (CITIES)
scripts/
  scrape-anapec.ts  # Scraper ANAPEC avec enrichissement IA (Gemini) et normalizeDate()
```

## Commandes utiles

```bash
npm run dev          # Serveur de developpement
npm run build        # Build production
npm run preview      # Preview du build
```

## Regles importantes

- Ne jamais supprimer les offres existantes sauf demande explicite
- Toujours verifier les doublons par `ref_offre` ou `slug` avant insertion
- **TOUJOURS** inserer `date_offre` au format `YYYY-MM-DD` (contrainte CHECK en base)
- Ne jamais utiliser les numeros de serie Excel pour les dates : extraire depuis `ref_offre`
- Les arrays PostgreSQL (`seo_keywords`, `required_skills`) s'inserent comme des arrays JSON normaux
- Le site est un SPA : toutes les routes passent par `index.html` (voir `vercel.json`)
- Pas de systeme de login : l'admin est protege par un simple mot de passe cote client
- Pour les fichiers Excel ANAPEC, installer `xlsx` (`npm install xlsx`) pour parser les fichiers .xls
- Toujours commiter et pousser sur `main` apres modification (deploiement auto Vercel)
- Apres insertion d'offres, toujours mettre a jour `public/sitemap.xml` et commiter
- Quand on modifie CATEGORY_FILTERS, mettre a jour les DEUX fichiers : `services/` et `src/services/`
