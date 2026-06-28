# 📥 Importer des offres d'emploi (Souss-Massa)

Mode d'emploi pour ajouter de nouvelles offres d'emploi (région Souss-Massa /
Agadir), **traduites en FR / EN / AR** et conformes à l'affichage du site.

> Tu lances les commandes ci-dessous **ici même** (dans une session Claude Code),
> quand tu veux. Le scraping et l'insertion sont automatiques ; la **traduction**
> est faite par Claude (qualité maximale, sans clé API).

## 🌐 Sources disponibles

| Source | Commande de scraping | Sortie |
|--------|----------------------|--------|
| **rekrute.com** (indépendant) | `node scripts/scrape-rekrute.cjs` | `scripts/import/pending-rekrute.json` |
| **marocannonces.com** | `node scripts/scrape-marocannonces.cjs` | `scripts/import/pending-marocannonces.json` |

> **Emploi.ma n'est pas disponible** : le site est protégé par Cloudflare et
> injoignable depuis l'environnement d'exécution (même via navigateur headless).
> Aucun scraper fiable n'est possible pour cette source pour l'instant.

Les deux sources alimentent **le même** flux de traduction/insertion. Tu peux
lancer l'une, l'autre, ou les deux ; le slash command `/import-offres` traite
automatiquement **tous** les fichiers `scripts/import/pending-*.json` présents.

---

## ⏱️ En 3 commandes

```bash
# 0. (la 1re fois seulement, ou sur un environnement neuf)
npm install

# 1. Scraper les NOUVELLES offres (dédoublonnées contre la base) — une source au choix :
node scripts/scrape-rekrute.cjs          # rekrute.com
node scripts/scrape-marocannonces.cjs    # marocannonces.com
```

**2. Dire à Claude (dans le chat) :** `/import-offres`
(ou bien : **« traduis et importe `scripts/import/pending-rekrute.json` »** pour une source précise)

Claude va alors :
- lire les nouvelles offres,
- les **traduire en anglais et en arabe** + enrichir (meta, mots-clés SEO,
  compétences, fourchette salariale),
- générer le fichier `scripts/import/translated-offers.json`,
- les **insérer** en base (`node scripts/insert-offers.cjs …`),
- **régénérer la sitemap** (`node scripts/gen-sitemap.cjs`),
- **committer et pousser** sur `main` (déploiement Vercel automatique).

C'est tout. ✅

---

## 🧩 Détail des étapes (et des scripts)

| Étape | Commande | Rôle |
|-------|----------|------|
| 1. Scraper | `node scripts/scrape-rekrute.cjs` | Récupère les offres rekrute (région Souss-Massa), normalise les villes, exclut le hors-région, **dédoublonne contre la base**, écrit les nouvelles offres FR dans `scripts/import/pending-rekrute.json` |
| 2. Traduire | *(fait par Claude)* | Traduit FR→EN→AR + enrichit, produit `scripts/import/translated-offers.json` |
| 3. Insérer | `node scripts/insert-offers.cjs scripts/import/translated-offers.json` | Insère les records complets, en ignorant les `ref_offre`/`slug` déjà présents |
| 4. Sitemap | `node scripts/gen-sitemap.cjs` | Régénère `public/sitemap.xml` depuis la base |
| 5. Déployer | `git add -A && git commit && git push origin main` | Met en ligne (Vercel auto) |

> Les étapes 3 à 5 sont lancées par Claude après la traduction. Tu peux aussi les
> exécuter toi-même : les scripts sont autonomes.

---

## ✅ Garanties

- **Pas de doublon** : le scraper ignore toute offre dont le `ref_offre` (`RK-…`)
  ou le `slug` existe déjà. Tu peux relancer sans risque.
- **Souss-Massa uniquement** : les villes hors région (Guelmim, Dakhla, Laâyoune…)
  sont exclues ; les communes sont ramenées aux noms canoniques (Agadir, Inezgane,
  Aït Melloul, Dcheira El Jihad, Biougra, Aït Baha, Taroudant, Tiznit, Tata).
- **Multilingue** : chaque offre est insérée avec ses colonnes `_en` / `_ar`.
  Si une traduction manquait, le site retombe automatiquement sur le français.
- **Format date** : toujours `YYYY-MM-DD` (contrainte base respectée).

---

## ⚠️ Bon à savoir

- **rekrute peut limiter le débit** (HTTP 503) : le scraper réessaie 3× avec
  back-off. S'il s'arrête tôt, relance-le simplement quelques minutes plus tard —
  les offres déjà importées seront ignorées.
- **marocannonces** : seules **Agadir, Taroudant, Tiznit** sont filtrables sur le
  site (autres communes Souss-Massa non proposées). Annonces souvent plus courtes /
  d'employeurs « confidentiel » → l'enrichissement par Claude complète la fiche.
- **Emploi.ma** : non branché (Cloudflare + injoignable depuis l'environnement).
- **ANAPEC** : non branché (structure HTML à valider d'abord).
- Les fichiers de `scripts/import/` sont **temporaires** et ignorés par git.

---

## 📂 Fichiers du pipeline

```
scripts/
  scrape-rekrute.cjs        # source rekrute.com — scraping + normalisation + dédup
  scrape-marocannonces.cjs  # source marocannonces.com — idem
  insert-offers.cjs         # insertion générique depuis un JSON traduit
  gen-sitemap.cjs           # régénération de public/sitemap.xml
  import/                   # sorties temporaires (git-ignoré)
```
