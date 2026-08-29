# Observatoire de l'emploi Souss-Massa — guide de publication

Rubrique éditoriale SEO du site : `/observatoire` (hub) et `/observatoire/{slug}` (article).
Objectif : faire de SoussMassa-RH **la référence** sur l'emploi dans la région (chômage,
actualité, stratégie régionale, veille), avec des articles **illustrés de diagrammes**.

## Signature des articles

Les analyses sont signees d'une **personne**, pas d'une organisation : c'est ce
qui leur donne leur autorite, et ce que Google evalue au titre de l'expertise de
l'auteur.

- `observatoire_articles.auteur` = **`Rachid Baddane`** pour tout nouvel article.
- Le bloc de signature (`components/AuthorSignature.tsx`) s'affiche sous chaque
  article : nom, **« Expert en emploi »**, et lien LinkedIn.
- Le JSON-LD `NewsArticle` declare un `author` de type **`Person`** avec
  `jobTitle` et, si le profil est renseigne, `sameAs`.

> **REGLE A NE JAMAIS ENFREINDRE** : ne mentionner **aucune fonction
> d'employeur ni titre administratif** dans la signature, les articles, les
> meta-donnees ou le JSON-LD. La signature se limite a l'expertise.

Le profil LinkedIn se renseigne a **un seul endroit** : `linkedin` dans
`src/config/author.ts`. Tant qu'il est vide, aucun lien n'est affiche ni publie
dans le JSON-LD — un lien errone vaut moins que pas de lien.

> `api/prerender.ts` **recopie** ces trois valeurs (`AUTEUR_NOM`,
> `AUTEUR_TITRE`, `AUTEUR_LINKEDIN`) au lieu de les importer : les modules de
> `api/` sont resolus a l'execution et non bundles, un import vers `../src/`
> casserait la fonction en production. **Les deux doivent rester synchronises.**


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

## Équilibrer les rubriques (anti-concentration)

Pour ne pas accumuler d'articles dans une seule rubrique, **ne choisis pas la catégorie au
hasard** : demande-la à la base via la fonction `next_observatoire_categorie()`, qui renvoie
la rubrique **publiée le moins récemment** (jamais publiée en priorité), puis la moins fournie :

```js
const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/next_observatoire_categorie`, {
  method: 'POST',
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
  body: '{}',
});
const categorie = await r.json();   // ex: "actualite"
```

Cette approche est **auto-correctrice** : elle tourne sur les 4 rubriques et rattrape les
retards même si un jour de publication a été manqué. L'onglet Observatoire de l'admin affiche
le compteur d'articles publiés par rubrique pour un suivi visuel.

## Baromètre mensuel (étude du marché à partir des offres du site)

En plus des articles quotidiens, publier **une fois par mois** une étude de référence du marché
du travail régional, calculée sur les offres réelles du site. Les statistiques sont fournies
**clés en main** par la fonction `observatoire_market_stats()` (aucune agrégation à refaire) :

```js
const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/observatoire_market_stats`, {
  method: 'POST',
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
  body: '{}',
});
const stats = await r.json();
// { total_offres, total_postes, nb_entreprises, periode_min/max,
//   contrats[], villes[], secteurs[{k,offres,postes}], competences[], salaires[], mois[] }
```

Consignes de rédaction du baromètre :
- **slug** daté : `barometre-emploi-souss-massa-AAAA-MM` (ex. `...-2026-08`) ; catégorie `veille`.
- Titre type : « Baromètre de l'emploi Souss-Massa — <Mois AAAA> ».
- Construis les diagrammes directement à partir de `stats` (camembert contrats, barres villes /
  secteurs offres / secteurs postes / compétences / salaires, courbe `mois`).
- Analyse la **divergence offres vs postes** par secteur, la **concentration sur Agadir**, les
  **compétences dominantes**, la **structure salariale**, et compare au mois précédent si possible.
- **Méthodologie + Limites** obligatoires (données = offres publiées, salaires indicatifs,
  classification automatisée, couverture croissante de la plateforme).
- Ne pas republier si un baromètre du même mois (même slug) existe déjà.

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
- **Style** : écrire « **à Souss-Massa** » ou « **dans la région de Souss-Massa** », **jamais « en Souss-Massa »** (tournure fautive). Apostrophes typographiques `'` (ne jamais doubler `''`).
- **Titres & dates** : ne **jamais mettre une année passée dans le TITRE ni dans le slug** (effet « daté » pour un lecteur de l'année en cours) — le titre porte l'**angle/l'insight**, pas l'année. En revanche, **toujours citer l'année de la donnée dans le corps et les sources** (ex. « 11,1 % de chômage en 2025 selon le HCP »). Utiliser **la donnée la plus récente disponible** et ne jamais présenter une donnée ancienne comme actuelle. Si une année doit figurer dans un titre, c'est **uniquement l'année en cours**. Seule exception : le **baromètre mensuel**, daté par nature (`titre` = « … <Mois AAAA> », slug `barometre-…-AAAA-MM`).
