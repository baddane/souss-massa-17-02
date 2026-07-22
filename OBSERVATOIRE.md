# Observatoire de l'emploi Souss-Massa — guide de publication

Rubrique éditoriale SEO du site : `/observatoire` (hub) et `/observatoire/{slug}` (article).
Objectif : faire de SoussMassa-RH **la référence** sur l'emploi dans la région (chômage,
actualité, stratégie régionale, veille), avec des articles **illustrés de diagrammes**.

## Architecture

- **Table** : `public.observatoire_articles` (migration `008_observatoire_emploi.sql`).
- **Pages** : `pages/Observatoire.tsx` (hub + filtres catégorie) et
  `pages/ObservatoireArticle.tsx` (article + SEO + JSON-LD `NewsArticle`).
- **Service** : `src/services/observatoireService.ts` (lecture publique = `statut='publie'`).
- **Diagrammes** : `components/ObsChart.tsx` — SVG **sans dépendance** (crawlable SEO),
  types `bar` | `line` | `donut`, alimentés par des specs JSON.
- **Rendu texte** : `components/MarkdownContent.tsx` (markdown léger : `##`, `-`, `**gras**`, `---`).
- **Sitemap** : `/observatoire` + articles ajoutés dans `api/sitemap.ts` **et**
  `scripts/gen-sitemap.cjs`.

## Sécurité (important pour la routine)

- Lecture publique : **articles publiés uniquement** (RLS `obs_public_read`).
- **INSERT autorisé avec la clé anon** (policy `obs_anon_insert`) → la routine publie de façon
  **100 % automatique**, sans secret, avec la clé anon déjà présente dans le dépôt.
- **UPDATE / DELETE réservés à l'admin** (`is_admin()`, policy `obs_admin_write`) → un tiers
  disposant de la clé anon publique **ne peut pas** modifier ni supprimer les articles existants
  (la modération reste entre tes mains).

## Schéma d'un article

| Colonne | Type | Notes |
|---|---|---|
| `slug` | text unique | SEO, en minuscules sans accents (utiliser `slugify`) |
| `titre` | text | Titre h1 |
| `categorie` | text | `chomage` \| `actualite` \| `strategie` \| `veille` |
| `chapo` | text | Chapeau (1-2 phrases, sert de meta_description par défaut) |
| `contenu` | text | Markdown. Insérer un diagramme avec un jeton `[[chart:N]]` sur sa propre ligne |
| `charts` | jsonb | Tableau de specs de diagrammes (voir ci-dessous) |
| `cover_emoji` | text | Emoji affiché devant le titre |
| `meta_title` / `meta_description` | text | SEO (meta_description ≤ 160 caractères) |
| `seo_keywords` | text[] | 5-10 mots-clés |
| `sources` | text[] | Sources officielles citées (HCP, ANAPEC, Conseil Régional…) |
| `date_publi` | text | **`YYYY-MM-DD`** (contrainte CHECK, comme les offres) |
| `temps_lecture` | int | minutes |
| `statut` | text | `publie` (visible) \| `brouillon` |

### Format des diagrammes (`charts`)

```json
[
  {
    "type": "bar",              // "bar" | "line" | "donut"
    "title": "Taux de chômage par ville",
    "unit": "%",
    "source": "HCP, 2025",
    "series": [
      { "label": "Agadir", "value": 11.2 },
      { "label": "Inezgane", "value": 13.5 }
    ]
  }
]
```

Dans `contenu`, placer `[[chart:0]]` là où le 1er diagramme doit apparaître, `[[chart:1]]`
pour le 2e, etc. Les diagrammes non référencés sont affichés en fin d'article.

## Publier depuis une routine (contrat)

1. Rédiger l'article (FR) : titre, chapo, `contenu` markdown + jetons `[[chart:N]]`,
   `charts` JSON, `sources` **réelles et vérifiables** (ne jamais inventer de chiffres
   officiels — citer la source exacte et l'année).
2. `slug` unique via `slugify(titre)` ; vérifier qu'il n'existe pas déjà.
3. `date_publi` au format **`YYYY-MM-DD`**.
4. Insérer dans `observatoire_articles` avec la **clé anon** (déjà dans le dépôt / les scripts,
   ex. `scripts/gen-sitemap.cjs`) — aucun secret ni variable d'environnement requis :

```js
const SUPABASE_URL = 'https://tqrhxhoqqktnhttzmoqt.supabase.co';
const SUPABASE_KEY = '<clé anon du dépôt>';
await fetch(`${SUPABASE_URL}/rest/v1/observatoire_articles`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify([{ /* colonnes ci-dessus */ }]),
});
```

5. Régénérer la sitemap : `node scripts/gen-sitemap.cjs`, puis commit/push `public/sitemap.xml`
   sur `main` (déploiement auto Vercel).

## Bonnes pratiques SEO

- 1 idée = 1 article ciblé sur une requête (« taux de chômage Agadir 2025 », etc.).
- `meta_description` ≤ 160 caractères, incluant la localité et l'année.
- Toujours au moins **1 diagramme** (les visualisations augmentent le temps de lecture).
- Citer des **sources officielles** (HCP, ANAPEC, Conseil Régional Souss-Massa, ministères).
- **Maillage interne** : `MarkdownContent` rend les liens `[texte](/url)`. Insérer 1-2 liens
  internes par article vers des pages du site (ex. `[offres dans le tourisme](/offres?sector=tourisme)`,
  `[emploi à Agadir](/offres?city=Agadir)`, `[toutes les offres](/offres)`) — bon pour le SEO.
  Liens externes `[texte](https://...)` acceptés (ouvrent dans un nouvel onglet).
- Publication **régulière** (le `changefreq` du hub est `daily`).
