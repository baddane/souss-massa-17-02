---
description: Importer les nouvelles offres rekrute Souss-Massa (scrape + traduction FR/EN/AR + insertion + sitemap + push)
---

Tu vas exécuter, de bout en bout, le pipeline d'import d'offres documenté dans
`IMPORT_OFFRES.md`. Procède dans cet ordre, sans demander de confirmation
intermédiaire (sauf erreur bloquante) :

## 1. Pré-requis
- Si `node_modules` est absent, lance `npm install` d'abord.

## 2. Scraper
- Lance : `node scripts/scrape-rekrute.cjs`
- Il écrit les NOUVELLES offres (dédoublonnées contre la base) dans
  `scripts/import/pending-rekrute.json`.
- **Si 0 nouvelle offre** : annonce-le et **arrête-toi là** (rien à faire).

## 3. Traduire + enrichir (qualité maximale, c'est toi qui traduis)
Lis `scripts/import/pending-rekrute.json`. Pour CHAQUE offre, produis un record
complet et écris le tableau dans `scripts/import/translated-offers.json`.

Champs à reprendre tels quels depuis le pending : `id`, `ville`, `ref_offre`,
`type_contrat`, `raison_sociale`, `date_offre`, `nbre_postes`, `emploi_metier`,
`full_description`, `slug`, plus `source: "rekrute"`, `statut: "active"`,
`is_featured: false`.

Champs à PRODUIRE :
- `emploi_metier_en`, `emploi_metier_ar` : traduction de l'intitulé.
- `full_description_en`, `full_description_ar` : traduction fidèle et naturelle
  de la description (anglais et arabe parfaits, pas de calque).
- `required_skills` (FR, 4-6 compétences déduites du poste/fonction),
  `required_skills_en`, `required_skills_ar` (même ordre).
- `suggested_salary_range` : fourchette estimée selon le poste/séniorité
  (marché marocain, format `"X-Y MAD"`).
- `seo_keywords` (FR) : `["emploi {ville-sans-accent}", "{metier-sans-accent} maroc",
  "recrutement souss-massa", "{contrat-minuscule} {ville-sans-accent}", "{1er mot de fonction}"]`.
- `meta_description` (FR) : `"{emploi_metier} à {ville} - {type_contrat} chez {raison_sociale}. Postulez en ligne."` (≤160 car.).
- `meta_description_en` : `"{titre_en} in {ville} at {raison_sociale} — {contratEN}. Apply online now."`
- `meta_description_ar` : `"{titre_ar} بمدينة {ville_ar} لدى {raison_sociale} — {contratAR}. تقدّم عبر الإنترنت الآن."`

Correspondances :
- contratEN : CDI→`Permanent`, CDD→`Fixed-term`, Stage→`Internship`, Alternance→`Apprenticeship`.
- contratAR : CDI→`عقد دائم`, CDD→`عقد محدد المدة`, Stage→`تدريب`, Alternance→`تكوين بالتناوب`.
- ville_ar : Agadir→`أكادير`, Inezgane→`إنزكان`, Aït Melloul→`أيت ملول`,
  Dcheira El Jihad→`الدشيرة الجهادية`, Biougra→`بيوكرى`, Aït Baha→`أيت باها`,
  Taroudant→`تارودانت`, Oulad Teima→`أولاد تايمة`, Tiznit→`تزنيت`, Tata→`طاطا`.

Reste fidèle au style des offres déjà en base (mêmes gabarits). Les noms
d'entreprises restent en caractères latins, y compris dans le texte arabe.

## 4. Insérer
- Lance : `node scripts/insert-offers.cjs scripts/import/translated-offers.json`
- Le script ignore tout `ref_offre`/`slug` déjà présent (pas de doublon).

## 5. Sitemap
- Lance : `node scripts/gen-sitemap.cjs` (régénère `public/sitemap.xml`).

## 6. Déployer
- `git add public/sitemap.xml`
- Commit clair (liste des postes importés + nouveau total) puis
  `git push origin main` (déploiement Vercel automatique).
- Si tu n'es pas sur `main`, NE pousse PAS ailleurs sans me demander.

## 7. Rapport final
Donne un récap court : nombre d'offres importées, postes/villes, nouveau total
en base, et confirmation du push. Les fichiers de `scripts/import/` sont
temporaires (git-ignorés) — ne les commite pas.
