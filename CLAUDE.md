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
| `statut` | text | Moderation : `active` (visible public), `en_attente` (offre entreprise a valider), `refuse` |
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
  sitemap.ts        # Edge Function - sitemap dynamique (offres statut='active' uniquement)
  robots.ts         # Edge Function - robots.txt (bloque /admin et /api/)
  apply.ts          # Serverless function - envoi candidature par email
  notify-company.ts # Serverless - email a l'entreprise quand l'admin valide son compte
  keepalive.ts      # Edge Function - ping Supabase (cron Vercel) pour eviter la pause free-tier

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
  NotFound.tsx      # Page 404 (noindex)

services/
  jobOffersService.ts  # CRUD offres (lecture publique = statut='active') — FICHIER PRINCIPAL
src/services/
  jobOffersService.ts  # Copie alternative — DOIT RESTER SYNCHRONISE avec services/
  companyService.ts    # Auth entreprise + profil + creation d'offre + moderation admin (dont deleteCompany)
  cvParser.ts          # Parsing CV 100% client SANS LLM (pdf.js + mammoth en import dynamique + regex)
  cvthequeService.ts   # CVtheque : upload bucket prive + parse + recherche + edit + suppression

constants.ts        # Liste des villes (CITIES, SOUSS_MASSA_CITIES)
scripts/
  scrape-anapec.ts          # Scraper ANAPEC (selecteurs non valides) — squelette
  scrape-rekrute.cjs        # Source rekrute.com : scraping + normalisation + dedup
  scrape-marocannonces.cjs  # Source marocannonces.com (Agadir/Taroudant/Tiznit)
  insert-offers.cjs         # Insertion generique d'offres (records traduits) dans Supabase
  gen-sitemap.cjs           # Regeneration de public/sitemap.xml depuis Supabase
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
- **Moderation** : onglets « Entreprises » et « Offres a valider » dans `pages/Admin.tsx`.
  Valider un compte → email via `api/notify-company.ts` (rappel identifiant + lien).
  Valider une offre → `statut='active'` (publiee).
- **Visibilite publique** : `jobOffersService` (les 2 copies), `api/sitemap.ts` et
  `scripts/gen-sitemap.cjs` ne renvoient que les offres `statut='active'`.

> **PREREQUIS CRITIQUE** : desactiver la confirmation d'email Supabase
> (Dashboard → Authentication → Sign In / Providers → Email → decocher
> « Confirm email »). Sinon, apres inscription, l'entreprise ne peut pas se
> connecter (« Email not confirmed ») — la validation se fait par l'admin, pas
> par email Supabase. L'email de notification utilise `GMAIL_APP_PASSWORD` (deja
> configure pour les candidatures).

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

- **Table** : `observatoire_articles` (migration `008`). Lecture publique = `statut='publie'` ;
  **ecriture reservee admin** (`is_admin()`) → la routine publie avec la cle **`service_role`**
  (jamais la cle anon, pour eviter le vandalisme).
- **Pages** : `pages/Observatoire.tsx`, `pages/ObservatoireArticle.tsx` (SEO + JSON-LD `NewsArticle`).
- **Service** : `src/services/observatoireService.ts`.
- **Diagrammes** : `components/ObsChart.tsx` (SVG maison, sans dependance : `bar`/`line`/`donut`),
  alimentes par le champ `charts` (JSON) et inseres dans le markdown via des jetons `[[chart:N]]`.
- **Dates** : `date_publi` au format `YYYY-MM-DD` (contrainte CHECK). **Sitemap** : `/observatoire`
  + articles ajoutes dans `api/sitemap.ts` et `scripts/gen-sitemap.cjs`.
- **i18n** : libelles nav/hub dans les 3 langues (`nav.observatoire`, `obs.*`) ; contenu des
  articles en FR.

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
- **CVtheque** (base documentaire admin) : table `cvtheque` + bucket `cvtheque`, **separes**
  des candidatures et du bucket `cvs`. Tout est **reserve a l'admin** (`is_admin()`) — RLS sur la
  table (policy `cvtheque_admin_all`) ET sur le storage (`cvtheque_obj_*`). Voir section dediee.

### Admin authentifie (plus de mot de passe en clair)
- `pages/Admin.tsx` se connecte via **Supabase Auth** (`signInWithPassword`) puis verifie
  l'appartenance a la table **`app_admins`** via la fonction SECURITY DEFINER **`public.is_admin()`**.
- Compte admin : **`admin@soussmassa-rh.com`** (id dans `app_admins`). Les lectures
  candidatures/messages/CV ne marchent **que** connecte en admin.

### Offres publiques
- Le public ne voit que les offres **`statut='active'`** (jobOffersService x2, `api/sitemap.ts`,
  `scripts/gen-sitemap.cjs`). Les offres entreprise (`en_attente`) et `refuse` sont masquees.

### Points NON encore durcis (dette connue, niveau « eleve »)
- **`job_offers`** : `INSERT/UPDATE/DELETE` encore ouverts a anon (necessaire aux scripts
  d'import). **`comptes_entreprise`** : `INSERT/UPDATE` encore ouverts a anon, mais **`DELETE`
  est desormais reserve a l'admin** (`is_admin()`, policy `ce_delete`, migration `005`). A terme :
  verrouiller les ecritures (Edge Functions + `service_role`) et empecher l'auto-validation du
  `statut` cote client.
- Une cle `service_role` d'un **ancien** projet a fuite dans les docs historiques : a revoquer.

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
- **Multilingue** : tout nouveau texte d'interface doit etre ajoute dans les 3 langues de
  `src/i18n/translations.ts` (jamais de texte en dur). Apres insertion d'une offre FR, remplir
  ses colonnes `_en` / `_ar` (voir section "Site multilingue"). Le site retombe sur le FR si absent.
