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
| `source` | text | Source de l'offre (ex: ANAPEC, Direct, rekrute, marocannonces, entreprise) |
| `slug` | text (unique) | Slug SEO pour l'URL permanente |
| `statut` | text | Moderation : `active` (visible public), `en_attente` (offre entreprise a valider), `refuse`, `retire` (retiree par l'entreprise) |
| `company_id` | uuid | Auteur si offre deposee par une entreprise (= `comptes_entreprise.id`), sinon null |
| `emploi_metier_en` / `emploi_metier_ar` | text | Traduction EN / AR de l'intitule (optionnel) |
| `full_description_en` / `full_description_ar` | text | Traduction EN / AR de la description (optionnel) |
| `meta_description_en` / `meta_description_ar` | text | Traduction EN / AR de la meta description (optionnel) |
| `required_skills_en` / `required_skills_ar` | text[] | Traduction EN / AR des competences (optionnel) |

> **Multilingue** : les colonnes `_en` / `_ar` sont des traductions optionnelles. Le frontend
> affiche la traduction correspondant a la langue active et **retombe sur le francais** (colonne
> de base) si elle est absente. Voir la section "Site multilingue (FR / EN / AR)" plus bas.

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

### Pre-rendu des balises head (`api/prerender.ts`)

Le site est un SPA : Vercel servait le meme `index.html` a toutes les URL, donc
le meme `<title>`, la meme description et **le meme `canonical` pointant vers la
page d'accueil** pour les 440+ offres. Les robots sociaux (Facebook, LinkedIn,
WhatsApp), qui n'executent aucun JavaScript, ne voyaient jamais le titre reel de
l'offre partagee.

- Reecritures `vercel.json` : `/emploi/:slug`, `/observatoire/:slug` et
  `/recrutement/:slug` passent par `/api/prerender` (**avant** le catch-all
  `/(.*)` → `/index.html`).
- Les pages entreprise `/recrutement/{slug}` n'ont **pas de colonne slug** : le
  slug est calcule depuis `raison_sociale`. `slugifyCompany()` du pre-rendu doit
  donc rester rigoureusement equivalent a `slugify()` de `components/SEO.tsx`,
  sinon la page pre-rendue ne correspond plus a celle que React affiche.
- La fonction edge **relit `index.html` du deploiement** (donc jamais de nom de
  bundle code en dur), remplace title / description / canonical / og:* /
  twitter:* et ajoute le JSON-LD `JobPosting` complet (`validThrough`,
  `identifier`, `totalJobOpenings`, `directApply`). Le `<body>` n'est **pas**
  touche : aucun risque de decalage visuel. Le texte de l'offre est ajoute dans
  un `<noscript>`, invisible pour un visiteur normal.
- **Repli systematique** sur l'`index.html` d'origine si Supabase ne repond pas :
  le pire cas est le comportement precedent, jamais une page cassee. Un vrai 404
  n'est renvoye que si l'offre est confirmee absente (evite les « soft 404 »).

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
- **Fonctions** : NE PAS mettre de bloc `functions` avec `runtime: "nodejs22.x"`
  dans vercel.json — cette valeur est rejetee par le builder (« Function Runtimes
  must have a valid version ») et chaque deploiement echoue. `api/apply.ts` et
  `api/notify-company.ts` tournent deja sur le runtime **Node par defaut** (seuls
  sitemap/robots/keepalive declarent `runtime: 'edge'`). Le vrai fix des 500
  `FUNCTION_INVOCATION_FAILED` etait `"type": "module"` dans package.json :
  Vercel transpile le TS en gardant la syntaxe ESM, sans lui Node chargeait les
  fonctions en CJS (« Cannot use import statement outside a module »). Ne pas
  retirer `"type": "module"` (postcss/tailwind sont alors en `.cjs`).

## Structure des fichiers cles

```
api/
  sitemap.ts        # Edge Function - sitemap dynamique (offres statut='active' uniquement)
  robots.ts         # Edge Function - robots.txt (bloque /admin et /api/)
  apply.ts          # Serverless function - envoi candidature par email
  notify-company.ts # Serverless - email de confirmation + identifiants (login + mdp temporaire)
                    #   quand l'admin valide un compte entreprise (API Admin Supabase)
  delete-company.ts # Serverless - supprime la fiche entreprise ET le compte Supabase Auth
                    #   (sinon l'email reste reserve et ne peut plus se reinscrire).
                    #   Verifie is_admin() et refuse de supprimer un compte de `app_admins`.
  keepalive.ts      # Edge Function - ping Supabase (cron Vercel) pour eviter la pause free-tier
  prerender.ts      # Edge Function - balises head + JSON-LD pour /emploi et /observatoire
  send-alerts.ts    # Serverless - alertes emploi des candidats (cron Vercel, Brevo)

components/
  SEO.tsx           # Composant SEO + generateJobPostingJsonLd + slugify
  ApplyModal.tsx    # Modal de candidature + upload CV (stocke cv_path, bucket prive)
  Header.tsx        # Navigation + CTA « Deposer une offre » (gauche) + LanguageSwitcher
  Footer.tsx        # Footer 4 colonnes (secteurs, villes Souss-Massa, navigation)

pages/
  Home.tsx          # Accueil (categories ?sector=, recherche, villes Souss-Massa, offres recentes)
  Offers.tsx        # Liste des offres avec 4 filtres (recherche, ville, contrat, secteur)
  JobDetail.tsx     # Detail d'une offre (route /emploi/:slug)
  Contact.tsx       # Formulaire de contact (stocke dans table `messages`)
  Admin.tsx         # Dashboard admin — login Supabase Auth (voir « Securite »), onglets :
                    #   Candidatures, Messages, Entreprises (valider/refuser/SUPPRIMER meme validee),
                    #   Offres a valider, + Nouvelle offre (SEO), CVtheque (voir section), Mon compte
  CompanyRegister/CompanyLogin/CompanyDashboard.tsx  # Espace entreprise (voir section dediee)
  CandidateRegister/CandidateLogin/CandidateDashboard.tsx  # Espace candidat (voir section dediee)
  NotFound.tsx      # Page 404 (noindex)

services/
  jobOffersService.ts  # CRUD offres (lecture publique = statut='active') — FICHIER PRINCIPAL
src/services/
  jobOffersService.ts  # Copie alternative — DOIT RESTER SYNCHRONISE avec services/
  companyService.ts    # Auth entreprise + profil + creation d'offre + moderation admin (dont deleteCompany)
  candidateService.ts  # Auth candidat + profil + CV + candidatures + alertes
  cvFields.ts          # Extraction des champs d'un CV : dictionnaires + regex, logique PURE
                       #   (partagee par l'interface et le script Node — ne pas la dupliquer)
  cvParser.ts          # Extraction du texte cote navigateur (pdf.js / mammoth / OCR) + re-export
  cvthequeService.ts   # CVtheque : upload bucket prive + parse + recherche + edit + suppression

constants.ts        # Liste des villes (CITIES, SOUSS_MASSA_CITIES)
scripts/
  scrape-anapec.ts          # Scraper ANAPEC (selecteurs non valides) — squelette
  scrape-rekrute.cjs        # Source rekrute.com : scraping + normalisation + dedup
  scrape-marocannonces.cjs  # Source marocannonces.com (Agadir/Taroudant/Tiznit)
  insert-offers.cjs         # Insertion generique d'offres (records traduits) dans Supabase
  gen-sitemap.cjs           # Regeneration de public/sitemap.xml depuis Supabase
  parse-cvtheque.ts         # Rattrapage des fiches CVtheque sans texte analyse
                            #   (npm run parse:cvtheque, exige SUPABASE_SERVICE_ROLE_KEY)
```

### Importer de nouvelles offres (rekrute.com + marocannonces.com)

Pipeline documente dans **`IMPORT_OFFRES.md`**, lancable via le slash command
**`/import-offres`** (traite tous les `scripts/import/pending-*.json`). En resume :
1. `node scripts/scrape-rekrute.cjs` et/ou `node scripts/scrape-marocannonces.cjs`
   → ecrivent les nouvelles offres FR (dedoublonnees) dans `scripts/import/pending-*.json`.
2. Claude lit ces fichiers, **traduit FR/EN/AR** + enrichit (pour marocannonces,
   redige aussi une description FR propre si l'annonce est courte/en arabe), ecrit
   `scripts/import/translated-offers.json` (records complets avec colonnes `_en`/`_ar`).
3. `node scripts/insert-offers.cjs scripts/import/translated-offers.json` → insertion.
4. `node scripts/gen-sitemap.cjs` → regenere la sitemap. Puis commit/push sur `main`.

Emploi.ma : non branche (Cloudflare + injoignable depuis l'environnement).
Quand l'utilisateur dit « traduis et importe `scripts/import/pending-*.json` »,
suivre les etapes 2 a 4 (meme gabarit que les offres existantes).

## Site multilingue (FR / EN / AR)

Le frontend est trilingue : **francais (defaut), anglais, arabe** (avec RTL).

### Architecture i18n (sans dependance externe)

- `src/i18n/translations.ts` : dictionnaires `fr` / `en` / `ar` pour TOUT le texte d'interface
  (menus, boutons, formulaires, filtres, libelles secteurs/villes/contrats, textes SEO).
- `src/i18n/LanguageContext.tsx` : provider React (`LanguageProvider`), hook `useT()`, et les
  helpers de localisation :
  - `localizeOffer(offer, lang)` : renvoie l'offre avec les champs `_en`/`_ar` resolus, **repli
    automatique sur le francais** si la traduction manque.
  - `cityLabel`, `contractShort`, `contractLong`, `positionsLabel`, `offersCountLabel`,
    `formatDateLocalized` : formatage localise.
- `components/LanguageSwitcher.tsx` : selecteur FR / EN / العربية (header desktop + mobile).
- Detection de la langue du navigateur au 1er chargement, choix memorise dans `localStorage`
  (cle `ssm_lang`). `dir="rtl"` applique sur `<html>` en arabe.

### Regles i18n a respecter

- **Aucun texte d'interface en dur** dans les composants : toujours passer par `t('cle')`.
  Si tu ajoutes une chaine visible, ajoute la cle dans **les 3 langues** de `translations.ts`.
- Le contenu dynamique des offres se traduit en base via les colonnes `_en` / `_ar`
  (jamais en dur dans le code). Le frontend retombe sur le francais si absent.
- En RTL, utiliser les classes logiques Tailwind (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`,
  `end-*`, `text-start`/`text-end`) plutot que `pl/pr/left/right`.

### Traduire une NOUVELLE offre (apres insertion FR)

Apres avoir insere une offre en francais, remplir ses colonnes de traduction. Pour chaque offre :
1. Traduire `emploi_metier` → `emploi_metier_en`, `emploi_metier_ar`.
2. Traduire chaque element de `required_skills` → `required_skills_en`, `required_skills_ar`
   (meme ordre).
3. Generer `full_description_en` / `full_description_ar` et `meta_description_en` /
   `meta_description_ar`. Les descriptions FR suivent un gabarit regulier : on peut regenerer
   les versions EN/AR depuis les champs structures (raison_sociale, ville, nbre_postes,
   type_contrat, intitule traduit, competences traduites, suggested_salary_range).

Gabarits utilises pour le parc existant (a reutiliser pour rester coherent) :
- **EN** : `{company}, based in {ville}, is hiring {for a|for N} {title} position(s) on a
  {permanent (CDI)|fixed-term (CDD)} contract. Offered salary: {salaire}.\n\nThe ideal candidate
  has skills in {skills}. Position based in {ville}, Souss-Massa region.`
- **AR** : `تشغّل شركة {company} الكائنة بمدينة {ville_ar} {N? } منصب {title_ar} بموجب {عقد دائم|عقد
  محدد المدة}. الأجر المقترح: {salaire_ar}.\n\nالمرشّح المثالي يتوفّر على مهارات في {skills_ar}.
  المنصب بمدينة {ville_ar}، جهة سوس ماسة.`
- Villes en arabe : Agadir → أكادير, Inezgane → إنزكان (ajouter les autres si besoin, cote SQL
  et dans `translations.ts` cle `city.*`).

Le site reste fonctionnel meme si une offre n'est pas encore traduite (repli FR).

## Espace entreprise (comptes + validation)

Les entreprises peuvent creer un compte et deposer des offres, validees par l'admin.

- **Auth** : Supabase Auth (email/mot de passe). Profil dans la table
  `comptes_entreprise` (id = auth.users.id ; `statut` = `en_attente`/`valide`/`refuse`).
- **Pages** : `/inscription-entreprise`, `/connexion-entreprise`, `/espace-entreprise`
  (pages/CompanyRegister|CompanyLogin|CompanyDashboard.tsx). Service :
  `src/services/companyService.ts` (`companyAuth`, `companyService`, `moderationService`).
- **Offres entreprise** : inserees dans `job_offers` avec `source='entreprise'`,
  `company_id`, et `statut='en_attente'` (invisibles du public tant que non validees).
- **Espace entreprise self-service** (`pages/CompanyDashboard.tsx`, 4 onglets) :
  - *Mes offres* : depot, **modification** et **retrait** de ses propres offres.
    Toute modification repasse le statut a `en_attente` (revalidation admin) ;
    « retirer » pose `statut='retire'` (masque du public, rien n'est detruit) ;
    « republier » repasse en `en_attente`. Pas de suppression definitive : les
    candidatures sont reliees par `ref_offre` et deviendraient inaccessibles.
  - *Candidatures* : celles deposees sur SES offres, avec telechargement du CV
    (URL signee, bucket prive).
  - *CVtheque* : recherche et telechargement (entreprises validees).
  - *Mon compte* : changement de mot de passe.
  Le cloisonnement est applique par la **RLS** (migrations `014` et `016`), pas
  par l'interface : le front utilise la cle anon, masquer cote React ne protege rien.
- **Moderation** : onglets « Entreprises » et « Offres a valider » dans `pages/Admin.tsx`.
  Valider un compte → email via `api/notify-company.ts` : confirmation + **login et
  mot de passe**. **L'inscription ne demande aucun mot de passe** (formulaire
  allege : nom, email, telephone, ville, secteur) ; `companyAuth.signUp` pose un
  mot de passe aleatoire jetable pour satisfaire Supabase Auth, et le vrai mot de
  passe est genere a la validation puis pose via l'API Admin
  `/auth/v1/admin/users/{id}` (cle `service_role`). **Chaque envoi regenere le mot
  de passe et invalide le precedent** — l'email et l'alerte admin le disent, car
  plusieurs envois produisent des messages au sujet identique que Gmail regroupe.
  L'endpoint **verifie que l'appelant est admin** (`is_admin()` via son JWT).
  Valider une offre → `statut='active'` (publiee).
- **Visibilite publique** : `jobOffersService` (les 2 copies), `api/sitemap.ts` et
  `scripts/gen-sitemap.cjs` ne renvoient que les offres `statut='active'`.

> **PREREQUIS CRITIQUE** : desactiver la confirmation d'email Supabase
> (Dashboard → Authentication → Sign In / Providers → Email → decocher
> « Confirm email »). Sinon, apres inscription, l'entreprise ne peut pas se
> connecter (« Email not confirmed ») — la validation se fait par l'admin, pas
> par email Supabase. L'email de notification part via **Brevo** et exige donc
> **`BREVO_API_KEY`** dans Vercel → Settings → Environment Variables, ainsi que
> **`SUPABASE_SERVICE_ROLE_KEY`** (utilisee par `notify-company` pour poser le mot
> de passe, et par `delete-company`).

> **Tous les envois passent par Brevo** (`api/_brevo.ts`, prefixe `_` = pas une
> route). Plus aucun envoi via Gmail/nodemailer : la dependance a ete retiree.
> `GMAIL_APP_PASSWORD` n'est plus utilisee nulle part. Pour diagnostiquer une
> variable manquante sans identifiants, appeler l'endpoint en POST sans jeton :
> il echoue sur le controle de la variable *avant* le controle d'authentification,
> et nomme la variable absente.

### Rattacher des offres existantes a un compte (onglet Entreprises)

Les 469 offres importees (ANAPEC, rekrute, marocannonces) ont `company_id = null`.
L'espace entreprise filtre sur `company_id`, **cote interface ET cote RLS**
(`cand_company_select`) : sans rattachement, une entreprise demarchee qui cree un
compte trouve un tableau de bord **vide**, alors que ses offres et ses
candidatures sont bien la. C'est ce qui ruinait l'argument de la prospection.

Bouton **« Rattacher ses offres »** sur chaque fiche entreprise
(`components/ClaimOffersPanel.tsx`, service `claimService`). Le panneau cherche
les offres actives **sans proprietaire** dont la raison sociale ressemble au nom
du compte, les regroupe par raison sociale exacte, et affiche pour chaque groupe
le **nombre de candidatures** — c'est precisement ce que le rattachement rend
visible, donc ce sur quoi l'admin doit juger.

- **Jamais automatique.** Un rattachement par correspondance de nom se
  tromperait : « Entreprise confidentielle » couvre a elle seule 68 offres de
  societes differentes, et une erreur donnerait a une entreprise l'acces aux CV
  et aux coordonnees des candidats d'une autre.
- **Reversible** : bouton « Detacher » sur chaque groupe deja rattache.
- **Idempotent** : `attach` filtre sur `company_id is null`, `detach` sur
  `company_id = ce compte`. Deux admins ne peuvent pas se voler une offre.
- **Aucune migration necessaire** : la policy `job_offers_admin_update` autorise
  l'admin, et le trigger `job_offers_company_guard` l'exempte explicitement
  (`if auth.uid() is null or public.is_admin() then return new`).

Verifie de bout en bout : compte « BEST PROFIL » validé → rattachement de 24
offres → le tableau de bord affiche 24 offres publiées et 22 candidatures, CV
telechargeables. Puis detachement et retour a l'etat initial.

## Comptes entreprise provisionnés (onglet admin « Identifiants »)

Pour que les entreprises qui recrutent deja sur le site puissent utiliser le
service sans rien remplir, la plateforme leur cree un compte pret a l'emploi,
avec un mot de passe genere, et **rattache automatiquement leurs offres**.

- **Endpoint** : `api/provision-companies.ts` (serverless, `service_role`).
  Appelants autorises : l'admin authentifie (`is_admin()` avec SON jeton) ou un
  appel machine porteur de `CRON_SECRET`. Quatre modes : `auto` (toutes les
  entreprises sans compte), `one` (creation manuelle), `password`, `email`.
- **Table `company_credentials`** (migration `025`) : login + **mot de passe en
  clair**, RLS **admin uniquement**. Volontairement separee de
  `comptes_entreprise`, que chaque entreprise peut lire pour sa propre fiche.
### Rattachement automatique en base (migration `027`)

Le rattachement d'une offre nouvellement inseree au compte de l'entreprise qui
la publie est fait par un **trigger** `job_offers_auto_claim` (BEFORE INSERT sur
`job_offers`), et non plus par le rappel HTTP du script d'import.

- **Pourquoi** : ce rappel exige `CRON_SECRET` ; sans lui le script abandonne
  silencieusement (par conception, pour ne pas faire echouer un import reussi).
  Constat du 2026-08-28 : 12 offres importees les 25-28 aout, appartenant a des
  entreprises **deja inscrites** (Manpower, AZURA GROUP, ECO TERRE, Artus, Vital
  Fer, Fondation Arrawaj), n'apparaissaient pas dans leur tableau de bord —
  exactement ce qui ruine la prospection.
- Un trigger ne depend d'aucune variable d'environnement ni d'aucun appel reseau,
  et couvre **tous** les chemins d'ecriture (import en anon ou `service_role`,
  SQL direct, dashboard, depot depuis l'espace entreprise).
- **Garde-fous identiques a ceux du bouton admin, a ne pas assouplir** :
  correspondance EXACTE sur `raison_sociale` (casse et espaces de bord ignores),
  **un seul** compte valide correspondant, noms generiques exclus, et jamais
  d'ecrasement d'un `company_id` deja pose.
- `array_agg` et non `min()` : **`min(uuid)` n'existe pas en Postgres** et
  l'erreur ferait echouer l'INSERT, donc l'import entier.
- **Revocation d'EXECUTE : c'est l'inverse de la migration `023`.** Sur une
  fonction *nouvelle*, Supabase pose des GRANT **nominatifs** a `anon` et
  `authenticated` (default privileges) ; un `revoke from public` seul ne retire
  rien et l'advisor continue de signaler la fonction. Il faut revoquer aux trois.
  Verifie : apres revocation, un INSERT en role `anon` rattache toujours.

- **Automatique a l'import** : `scripts/insert-offers.cjs` appelle l'endpoint en
  fin de course, **sans jamais bloquer** — les offres sont deja inserees, un
  provisionnement en echec ne doit pas faire echouer un import reussi. Sans
  `CRON_SECRET`, le script le signale et l'admin rattrape d'un bouton.
  *Pas de cron dedie* : le plan Vercel limite le nombre de crons, et un
  deploiement refuse casserait le site.

### Identifiants techniques (migration `026`)

170 des 177 entreprises n'ont pas d'adresse connue. Un compte Auth **est** une
adresse email : sans elle, pas de login. On en fabrique donc une a partir des
initiales et de l'annee — `BEST PROFIL` → `bp2026@comptes.soussmassa-rh.com` —
avec suffixe numerique en cas de collision.

> **Le sous-domaine `comptes.soussmassa-rh.com` n'existe pas volontairement** :
> sans MX, un envoi echoue immediatement chez l'expediteur au lieu d'etre avale
> par le routage email du domaine principal.

`sendBrevoEmail()` **refuse** toute adresse de ce domaine. Le controle est dans
la fonction d'envoi, pas chez les appelants : c'est le seul endroit qui garantit
qu'aucun email ne partira jamais vers ces adresses. Des rebonds repetes
degraderaient la reputation du domaine et feraient retomber en spam les emails
legitimes — alertes candidats comprises, qui viennent tout juste d'etre reparees.
`notify-application` sort avant de poser `notified_company`, pour que l'email
parte le jour ou la vraie adresse sera renseignee.

### Regles a ne pas contourner

- **Jamais d'UPDATE direct sur le mot de passe ou l'email** : ils vivent dans
  Supabase Auth. Un UPDATE sur `company_credentials` ferait afficher a l'admin
  un identifiant qui ne fonctionne pas. Passer par les modes `password` / `email`.
- **Noms non provisionnables** : « Entreprise confidentielle », « xxxx », noms de
  moins de 3 ou plus de 60 caracteres. Ils recouvrent plusieurs societes — un
  compte unique donnerait a l'une les CV et coordonnees des candidats des autres.
- **Rattachement des offres** : correspondance EXACTE sur `raison_sociale`, et
  uniquement les offres sans proprietaire.

## Espace candidat (comptes, consentement, alertes) — migrations `022` / `024`

Le pendant de l'espace entreprise. Contrairement a l'entreprise, le candidat
**n'attend aucune validation admin** : il choisit son mot de passe et accede
immediatement a son espace (imposer une moderation ici assecherait la base, qui
est justement ce qui donne de la valeur au cote recruteur).

- **Pages** : `/inscription-candidat`, `/connexion-candidat`, `/espace-candidat`
  (`pages/CandidateRegister|CandidateLogin|CandidateDashboard.tsx`).
  Service : `src/services/candidateService.ts` (`candidateAuth`, `candidateService`,
  `alertsService`).
- **Table `candidats`** (id = `auth.users.id`) : profil, CV (`cv_path` dans
  `cvs/candidat/{uid}/`), disponibilite, contrats et villes souhaites,
  `visible_recruteurs` (consentement) et `actif` (recherche en pause).
- **4 onglets** : *Mon profil* (CV + analyse locale de pre-remplissage, barre de
  completion), *Mes candidatures*, *Mes alertes*, *Mon compte*.
- **Historique par email** : la policy `cand_self_select` rapproche les
  candidatures par `candidate_email` = email du compte. Un candidat qui s'inscrit
  avec l'adresse deja utilisee pour postuler retrouve tout son historique, y
  compris anterieur a la creation du compte.
- **Candidature en un clic** : `ApplyModal` reprend coordonnees et CV du profil
  connecte ; le CV est **recopie** sous `ref_offre/` pour que le cloisonnement par
  offre (migration 014) reste vrai.
- Comme cote entreprise, `signUp` **ferme toute session avant l'inscription** et
  verifie que le compte renvoye correspond a l'email saisi — c'est le piege qui
  avait greffe une fiche entreprise sur le compte admin. Un compte admin ne peut
  pas porter de fiche candidat (policy `candidats_self_insert`).

### Consentement CVtheque (le point le plus sensible juridiquement)

Avant, postuler faisait entrer le CV dans la CVtheque consultee par toutes les
entreprises validees, **sans information ni possibilite de refus**.

- `cvtheque.visible_recruteurs` et `candidatures.consent_cvtheque`, **defaut
  `true`** : les 112 fiches et 234 candidatures existantes gardent exactement le
  comportement d'avant, rien ne disparait retroactivement.
- Le formulaire de candidature porte une case a cocher (cochee par defaut,
  decochable). Un **refus** exprime la se propage a toutes les fiches portant
  l'email ; un accord ne re-expose jamais un profil masque depuis l'espace
  candidat — sinon une case a cocher annulerait un choix plus fort.
- Le retrait depuis l'espace candidat se propage a **toutes** les fiches de
  l'email, table *et* stockage (`cvs_company_read_via_cvtheque`,
  `cvtheque_company_read` verifient `visible_recruteurs`).
- Le candidat n'ecrit jamais directement dans `cvtheque` : il edite `candidats`,
  et le trigger SECURITY DEFINER `candidats_sync_cvtheque` repercute. Ouvrir
  `cvtheque` en ecriture aux authentifies aurait expose une table de donnees
  personnelles a tous les comptes.

### Alertes emploi (`job_alerts` + `api/send-alerts.ts`)

- Table `job_alerts` (metier, ville, type de contrat, frequence quotidienne ou
  hebdomadaire, `actif`, `last_sent_at`), 5 alertes maximum par candidat.
- **L'email est repose par le trigger `job_alerts_guard`** depuis le profil :
  sans cela, la plateforme devenait un relais permettant de faire envoyer des
  emails a une adresse tierce.
- `api/send-alerts.ts` (cron Vercel `0 7 * * *`) envoie les offres publiees
  **depuis le dernier email** et correspondant aux criteres. Comparaison
  insensible aux accents (« ait melloul » doit trouver « Aït Melloul »).
  `last_sent_at` est pose **avant** l'envoi : l'endpoint est idempotent, un rejeu
  ne renvoie rien — c'est ce qui le rend inoffensif meme appele de l'exterieur.
  Aucun email vide n'est envoye.
- Variable facultative **`CRON_SECRET`** (Vercel) : si elle existe, Vercel
  l'envoie en `Authorization: Bearer` et l'endpoint refuse tout autre appelant.

### Rapprochement offre → profils

Chaque offre de l'espace entreprise porte un bouton **« Profils correspondants »**
qui ouvre la CVtheque pre-filtree sur l'intitule et la ville
(`CvthequeExplorer` accepte `initialFilters`).

## Parcours d'inscription (principe : 0 friction)

**Regle** : ne jamais demander un compte avant d'avoir rendu le service. Le
compte est le sous-produit d'une action deja accomplie, pas un peage a l'entree.

### Menu (`components/Header.tsx` + `src/hooks/useAccount.ts`)

Deux actions symetriques a droite, formulees comme des **actions** et non comme
des lieux, et adaptees au compte connecte :

| Visiteur | Bouton contour | Bouton plein |
|---|---|---|
| Anonyme | Déposer une offre → `/recruter` | **Déposer mon CV** → `/inscription-candidat` |
| Candidat | — | Mon espace candidat |
| Entreprise | Mon espace entreprise | — |

`useAccount()` ne declenche **aucune requete** pour un visiteur anonyme :
l'absence de session suffit a conclure. Les deux lectures (`candidats`,
`comptes_entreprise`) ne partent que pour un compte deja connecte.

> Ne pas reintroduire de libelle du type « Mon espace » affiche a tout le monde :
> il presuppose la possession et n'apprend rien a qui n'a pas de compte.
> Ne pas remettre deux entrees de menu vers la meme page.

### Candidat : le compte naît de la candidature (`components/ApplyModal.tsx`)

Le formulaire de candidature collecte deja nom, email, telephone et CV — les
champs du profil. Une fois la candidature enregistree, un visiteur anonyme voit
donc un panneau qui reprend ce qu'il vient de saisir et ne demande **qu'un mot
de passe**. Le compte est cree, le profil recoit le CV deja televerse, et il
arrive connecte dans son espace avec sa candidature visible.

Le consentement CVtheque coche dans le formulaire est repris tel quel : postuler
et creer son espace expriment le meme choix, on ne le redemande pas.

### Candidat : l'alerte depuis la recherche (`components/AlertSignupCard.tsx`)

Sous la liste de `/offres`. La recherche en cours **sert de criteres** (metier,
ville, contrat) : on ne les redemande pas. Anonyme = email + mot de passe ;
candidat connecte = un seul bouton.

### Entreprise : l'offre avant le compte (`pages/CompanyRegister.tsx`)

Etape 1 = l'annonce (intitule, ville, contrat, description...), etape 2 = les
coordonnees, la ou elles ont un sens : c'est la qu'arriveront les candidatures.
`companyAuth.signUp(email, profile, offer?)` cree l'offre **pendant** la session
d'inscription — apres le `signOut` final, l'insertion repasserait en anon et
dependrait des ecritures anon de `job_offers`, qui ont vocation a fermer
(migration `017`).

Moderation inchangee : l'offre part en `en_attente`. Le lien « Je n'ai pas
encore d'offre a publier » conserve l'ancien parcours (compte seul).

## CVtheque (base de CV admin, parsing SANS LLM)

Onglet **CVtheque** dans `pages/Admin.tsx` : l'admin importe des CV, ils sont stockes,
parses et classes dans une table dediee pour un **moteur de recherche dynamique**. Totalement
**separe** des candidatures/CV des postulants.

- **Stockage** : bucket prive **`cvtheque`** (distinct de `cvs`). Fichiers PDF, Word (.docx),
  image, .txt. Lecture via **URL signee** (~120 s).
- **Table** : **`cvtheque`** (voir migration `supabase/migrations/006_cvtheque.sql`). Champs :
  `nom_complet, email, telephone, ville, quartier, poste, diplome, niveau_etudes,
  competences[], langues[], experience_years, keywords[], raw_text, notes` + `search_tsv`
  (tsvector FR alimente par **trigger** `cvtheque_search_update`, pas une colonne generee — le
  cast `'french'::regconfig` n'est pas immutable).
- **Parsing 100% cote client, SANS LLM** (`src/services/cvParser.ts`) :
  - Texte : **pdf.js** (PDF) et **mammoth** (.docx), charges en **import dynamique** → chunks
    separes, le bundle du site public n'est PAS impacte. Images / ancien `.doc` : pas d'OCR →
    fiche a completer a la main.
  - Champs : **regex + dictionnaires** (email, tel MA, ville, quartier, diplome/niveau,
    competences, langues, annees d'experience). Precision imparfaite → **fiche editable**.
- **Service** : `src/services/cvthequeService.ts` (`uploadAndParse`, `search`, `signedUrl`,
  `update`, `remove`). Recherche = full-text FR (`textSearch('search_tsv', q, {config:'french'})`)
  + filtres `ilike` (poste/ville/diplome), `contains` (competence), `gte` (experience min).
- **Securite** : RLS **admin-only** (`is_admin()`) sur la table (`cvtheque_admin_all`) et le
  bucket (`cvtheque_obj_select/insert/delete`). Aucune donnee personnelle exposee au public.
- **Dependances ajoutees** : `pdfjs-dist`, `mammoth` (uniquement chargees a la demande dans l'admin).

## Observatoire de l'emploi (rubrique editoriale SEO)

Rubrique `/observatoire` (hub) + `/observatoire/{slug}` (article) : analyses du marche du travail
Souss-Massa (chomage, actualite, strategie regionale, veille), **illustrees de diagrammes**.
Documentation complete + contrat de publication pour la routine : **`OBSERVATOIRE.md`**.

- **Table** : `observatoire_articles` (migrations `008` + `009`). Lecture publique = `statut='publie'`.
  **INSERT autorise en anon** (migration `009`, workflow routine 100% automatique sans secret) ;
  **UPDATE/DELETE reserves admin** (`is_admin()`) → un tiers ne peut pas alterer/supprimer les
  articles existants. Moderation admin via SQL/dashboard.
- **Pages** : `pages/Observatoire.tsx`, `pages/ObservatoireArticle.tsx` (SEO + JSON-LD `NewsArticle`).
- **Service** : `src/services/observatoireService.ts`.
- **Diagrammes** : `components/ObsChart.tsx` (SVG maison, sans dependance : `bar`/`line`/`donut`),
  alimentes par le champ `charts` (JSON) et inseres dans le markdown via des jetons `[[chart:N]]`.
  Le composant gere **pour tous les articles, presents et futurs** : bouton **« Agrandir »**
  (plein ecran + zoom jusqu'a 400 %, `Echap` ferme), **defilement horizontal** plutot que
  ecrasement des libelles sur mobile, axe **partant de zero** (une valeur negative descend sous
  la ligne au lieu de disparaitre), nombres au **format francais**, et unite longue affichee
  **une fois** sous le titre (« en milliers ») au lieu d'etre collee a chaque valeur.
- **Coherence des chiffres et ton** : contrat detaille dans `OBSERVATOIRE.md`. Deux regles a ne
  pas enfreindre — (1) les series d'un diagramme **somment au total annonce dans le texte**,
  toute base differente est ecrite dans le titre du diagramme ; (2) **aucun possessif** designant
  le site (« notre plateforme », « nos offres », « nous publions ») : l'auteur signe en analyste,
  la plateforme est citee a la troisieme personne.
- **Dates** : `date_publi` au format `YYYY-MM-DD` (contrainte CHECK). **Sitemap** : `/observatoire`
  + articles ajoutes dans `api/sitemap.ts` et `scripts/gen-sitemap.cjs`.
- **i18n** : libelles nav/hub dans les 3 langues (`nav.observatoire`, `obs.*`) ; contenu des
  articles en FR.

## Prospection entreprises (onglet admin « Prospection », envoi Brevo)

Onglet **Prospection** dans `pages/Admin.tsx` : liste des employeurs presents via leurs offres
(a convertir en comptes entreprise inscrits). Chaque cible a sa page vitrine `/recrutement/{slug}`.

- **Table** : `outreach_targets` (migration `012_outreach_targets`), **admin-only** (RLS
  `outreach_admin_all` via `is_admin()`). Champs : `raison_sociale, slug, ville, nb_offres,
  postes, email, statut (a_contacter/contacte/inscrit/ignore), date_contact, notes`.
  Pre-remplie depuis `job_offers` (statut='active'), regroupee par slug entreprise, emails vides.
- **Service** : `src/services/outreachService.ts` (`list`, `update`, `importEmails`, `send`).
  L'admin saisit les emails a la main (inline) ou en masse (`Nom;email` par ligne).
- **Envoi** : serverless `api/send-outreach.ts` → **Brevo transactional API**
  (`https://api.brevo.com/v3/smtp/email`). Expediteur `contact@soussmassa-rh.com`
  (surchargeable via `BREVO_SENDER_EMAIL`/`BREVO_SENDER_NAME`). Jetons `{entreprise}`,
  `{ville}`, `{slug}`, `{url}`. Envois reussis → `statut='contacte'`.
- **Securite** : l'endpoint **exige le jeton de session** de l'appelant et verifie `is_admin()`
  cote Supabase AVANT d'envoyer (sinon relais de spam ouvert). Max 200 destinataires/appel.
- **PREREQUIS** (une fois) : valider l'expediteur/domaine `soussmassa-rh.com` dans **Brevo** ;
  ajouter `BREVO_API_KEY` dans **Vercel** (Settings → Environment Variables). Plan gratuit
  Brevo = ~300 envois/jour. Modeles d'e-mail/message : `MARKETING_OUTREACH.md`.

## Securite (RLS, donnees candidats, auth admin)

Modele : le frontend utilise la **cle anon (publique)**. Les protections reposent donc
sur les **politiques RLS** Supabase, pas sur le code client.

### Donnees personnelles (candidatures, messages, CV) — durci
- **`candidatures`** et **`messages`** : RLS active, **ecriture seule** pour le public
  (`INSERT` anon : postuler / contacter) ; **lecture / maj / suppression reservees a l'admin**
  authentifie (`is_admin()`).
- **CV** : bucket `cvs` **prive**. La candidature stocke le **chemin** (`cv_path`), pas une URL
  publique. L'admin telecharge via **URL signee** (`storage.createSignedUrl`, ~120 s).
  L'upload reste possible en anon (policy INSERT conservee).
- **CVtheque** : table `cvtheque` + bucket `cvtheque`, **separes** des candidatures et du
  bucket `cvs`. Ecriture / suppression **reservees a l'admin** (`cvtheque_admin_all`,
  `cvtheque_obj_*`). En lecture, les entreprises validees ne voient que les profils
  **consentants** (`visible_recruteurs`, migration `022`) — table *et* stockage.

### `candidats` et `job_alerts` (migration `022`)
- **`candidats`** : lecture / ecriture reservees au proprietaire (`id = auth.uid()`) ou a
  l'admin. Le trigger `candidats_guard` fige `id`, `email` et `created_at` — une policy ne
  sait pas restreindre les colonnes, et le rapprochement CVtheque se faisant par email,
  pouvoir le changer aurait permis de prendre la main sur la fiche d'un autre.
- **`job_alerts`** : idem, plus le trigger `job_alerts_guard` qui **repose l'email depuis le
  profil**. Sans lui, la plateforme devenait un relais d'envoi vers une adresse tierce.
- **Bucket `cvs`** : le candidat lit/depose uniquement sous `candidat/{son uid}/`, et relit
  les CV de ses propres candidatures (`cvs_self_read`, rapprochement par email).
- **Verifie en conditions reelles** (compte de test cree puis supprime) : changement d'email
  refuse silencieusement, email d'alerte force, CVtheque et candidatures des autres invisibles,
  retrait du consentement propage jusqu'au stockage.

### Fonctions de trigger non appelables (migration `023`)
La migration `018` revoquait `EXECUTE` a `anon` et `authenticated` — **sans effet** : le droit
ne venait pas d'un grant nominatif mais du `GRANT` implicite a `PUBLIC`. L'advisor Supabase
continuait donc, a juste titre, de signaler ces fonctions comme exposees via `/rest/v1/rpc/`.
La `023` revoque a `PUBLIC`. Un trigger continue de fonctionner : il s'execute avec les droits
du proprietaire de la table, jamais avec ceux de l'appelant. `is_admin()`,
`is_validated_company()` et `public_marketing_stats()` restent volontairement appelables.

### Admin authentifie (plus de mot de passe en clair)
- `pages/Admin.tsx` se connecte via **Supabase Auth** (`signInWithPassword`) puis verifie
  l'appartenance a la table **`app_admins`** via la fonction SECURITY DEFINER **`public.is_admin()`**.
- Compte admin : **`admin@soussmassa-rh.com`** (id dans `app_admins`). Les lectures
  candidatures/messages/CV ne marchent **que** connecte en admin.

### Offres publiques
- Le public ne voit que les offres **`statut='active'`** (jobOffersService x2, `api/sitemap.ts`,
  `scripts/gen-sitemap.cjs`). Les offres entreprise (`en_attente`) et `refuse` sont masquees.

### `comptes_entreprise` — verrouille (migration `013`)
- **SELECT** : sa propre fiche ou admin. Avant, `USING (true)` en anon exposait publiquement
  les emails et telephones de toutes les entreprises.
- **INSERT** : `authenticated` uniquement, `id = auth.uid()` et `statut = 'en_attente'`.
- **UPDATE** : sa propre fiche ou admin ; le trigger `ce_protect_moderation_fields` restaure
  `statut`, `validated_at`, `notified`, `id` et `email` pour tout appelant qui n'est ni admin
  ni `service_role` (une policy RLS ne sait pas restreindre les colonnes). L'auto-validation
  cote client est donc impossible : la requete « reussit » sans rien changer.
- **DELETE** : admin uniquement (migration `005`).
- L'INSERT exige une session : il fonctionne parce que « Confirm email » est **desactive**
  (signUp renvoie une session). Reactiver cette option casserait l'inscription.

### `job_offers` — gestion par l'entreprise (migration `016`)
- Policy `job_offers_company_update` : `authenticated`, `company_id = auth.uid()` et
  entreprise validee. Le trigger `job_offers_company_guard` fige `id`, `company_id`,
  `ref_offre`, `created_at`, `source`, et **borne les statuts** : seul `retire` est
  accepte tel quel, toute autre valeur (dont `active`) retombe sur `en_attente`.
  Une entreprise ne peut donc **pas** publier son offre elle-meme.
- Le trigger est neutralise quand `auth.uid() is null` (SQL direct, `service_role`,
  scripts d'import en anon) : le pipeline `/import-offres` n'est pas impacte (verifie).

### Bascule des scripts sur `service_role` (preparee, a finaliser)

Les scripts lisent leur cle via **`scripts/_supabase.cjs`** : `service_role` si
`SUPABASE_SERVICE_ROLE_KEY` est definie, **repli sur la cle anon** sinon. Chaque
script affiche au demarrage laquelle il utilise (`cle service_role detectee` /
`cle anon (repli)`), sans jamais afficher la cle. Les deux workflows GitHub
transmettent deja la variable.

Les lectures de dedoublonnage **echouent desormais bruyamment** : avant, une cle
invalide renvoyait une liste vide, toutes les offres passaient pour nouvelles et
etaient reinserees en **doublon**. Les scripts s'arretent maintenant net.

Pour finir la bascule :
1. Creer le secret GitHub `SUPABASE_SERVICE_ROLE_KEY` (Settings > Secrets and
   variables > Actions).
2. En local : `export SUPABASE_SERVICE_ROLE_KEY='...'` avant tout import.
3. Verifier que les scripts affichent « cle service_role detectee ».
4. Appliquer **`supabase/migrations/017_job_offers_lock_writes.sql`**
   (volontairement NON appliquee : elle retire les ecritures anon).

### Points NON encore durcis (dette connue, niveau « eleve »)
- **`job_offers`** : `INSERT/UPDATE/DELETE` encore ouverts a **anon**. La cle anon
  etant publique (elle est dans le bundle du site), n'importe qui peut creer,
  modifier ou supprimer une offre. Correctif pret : migration `017`, a appliquer
  apres la bascule ci-dessus.
- **`observatoire_articles`** : `INSERT` encore ouvert a anon (migration `009`,
  pour la routine editoriale). Meme bascule a prevoir si on veut le fermer.
- Une cle `service_role` d'un **ancien** projet a fuite dans les docs historiques : a revoquer.
- **Consentement retroactif** : les fiches CVtheque anterieures a la migration `022` sont
  `visible_recruteurs = true` par defaut. C'est le statu quo, pas un consentement recueilli.
  Le seul moyen propre de le regulariser est d'ecrire aux candidats concernes pour qu'ils
  creent leur espace et confirment (ou se retirent).
- **Delivrabilite** : tant que SPF ne contient pas `include:spf.brevo.com` et que la cle DKIM
  `brevo._domainkey` n'est pas publiee, les emails (validation entreprise, alertes emploi,
  notification de candidature) partent en spam. C'est un prerequis DNS, pas du code.

> Apres tout changement DDL/RLS, lancer l'advisor securite Supabase (`get_advisors security`)
> et **tester les 4 parcours publics** (upload CV, postuler, contact, inscription entreprise)
> pour verifier qu'on n'a rien casse.

## Keepalive Supabase (cron Vercel)

Le free-tier Supabase met le projet en pause apres ~7 jours d'inactivite. Un **cron Vercel**
(`vercel.json` > `crons`) appelle quotidiennement **`/api/keepalive`** (requete minimale sur
`job_offers`) pour garder le projet actif. Pensez a verifier que le cron est actif :
Vercel → projet → Settings → Cron Jobs.

## Commandes utiles

```bash
npm run dev          # Serveur de developpement
npm run build        # Build production (tsc + vite)
npm run preview      # Preview du build
npm run parse:cvtheque              # Rattrape les fiches CVtheque sans texte analyse
npm run parse:cvtheque -- --dry-run # ... sans rien ecrire (exige SUPABASE_SERVICE_ROLE_KEY)
```

## Regles importantes

- Ne jamais supprimer les offres existantes sauf demande explicite
- Toujours verifier les doublons par `ref_offre` ou `slug` avant insertion
- **TOUJOURS** inserer `date_offre` au format `YYYY-MM-DD` (contrainte CHECK en base)
- Ne jamais utiliser les numeros de serie Excel pour les dates : extraire depuis `ref_offre`
- Les arrays PostgreSQL (`seo_keywords`, `required_skills`) s'inserent comme des arrays JSON normaux
- Le site est un SPA : toutes les routes passent par `index.html` (voir `vercel.json`)
- **Admin** : login via **Supabase Auth** (compte `admin@soussmassa-rh.com`, table `app_admins`,
  fonction `is_admin()`). L'ancien mot de passe en clair `souss2026` n'existe plus (voir « Securite »).
- Pour les fichiers Excel ANAPEC, installer `xlsx` (`npm install xlsx`) pour parser les fichiers .xls
- Toujours commiter et pousser sur `main` apres modification (deploiement auto Vercel)
- Apres insertion d'offres, toujours mettre a jour `public/sitemap.xml` et commiter
- Quand on modifie CATEGORY_FILTERS, mettre a jour les DEUX fichiers : `services/` et `src/services/`
- **Inscription** : ne jamais ajouter d'etape avant la valeur rendue. Toute nouvelle
  entree doit reprendre ce que l'utilisateur a deja saisi plutot que le lui redemander.
- **Consentement** : ne jamais elargir la visibilite d'un profil CVtheque sans action explicite
  du candidat. `visible_recruteurs` ne repasse a `true` que depuis l'espace candidat.
- **Multilingue** : tout nouveau texte d'interface doit etre ajoute dans les 3 langues de
  `src/i18n/translations.ts` (jamais de texte en dur). Apres insertion d'une offre FR, remplir
  ses colonnes `_en` / `_ar` (voir section "Site multilingue"). Le site retombe sur le FR si absent.
