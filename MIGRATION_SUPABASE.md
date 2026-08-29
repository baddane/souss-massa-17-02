# Migration vers un projet Supabase dédié

Déplacer la base du site depuis `Générateur_offres` (organisation *baddane's Org*,
partagé avec d'autres sites) vers un projet neuf dans l'organisation
**Souss-massa-rh**.

> **Le principe qui rend l'opération sûre : on ne supprime jamais la source.**
> On construit à côté, on vérifie, on bascule les clés. Si quoi que ce soit
> cloche, on remet les anciennes clés et le site retrouve ses données intactes.
> Le seul point de non-retour est *après* la bascule : les candidatures reçues
> sur le nouveau projet n'existent pas dans l'ancien.

---

## 1. Ce qu'il faut savoir avant de commencer

### Piège n°1 — les migrations du dépôt ne décrivent pas la production

`001_initial_schema.sql` et `004_companies_schools_advice_blog.sql` créent
`applications`, `users`, `companies`, `schools`, `blog_posts`… **Aucune de ces
tables n'existe en production** (vérifié par introspection). Ce sont des
reliquats du template. Les rejouer produirait une base *différente*.

**La source de vérité, c'est :**

| Source | Contenu |
|---|---|
| `supabase_migrations.schema_migrations` (base vivante) | le SQL exact des **34 migrations réellement appliquées**, dans l'ordre |
| `000_baseline_job_offers_app_admins.sql` | `job_offers` et `app_admins`, créées à la main avant le suivi des migrations |

### Piège n°2 — les chemins de fichiers

`cvtheque.file_path` et `candidatures.cv_path` stockent des **chemins**, pas des
URL. Un seul chemin qui change et le CV devient introuvable, pour 112 profils et
271 candidatures. `scripts/migrate-storage.cjs` recopie chaque objet sous
exactement le même chemin et refuse de continuer en cas de divergence de taille.

### Piège n°3 — Postgres n'est pas joignable depuis l'agent

`pg_dump` / `psql` sont inutilisables depuis l'environnement Claude : le port
5432/6543 est bloqué, seul HTTPS sort. La migration se fait donc par SQL via le
connecteur MCP (schéma + données) et par l'API Storage (fichiers).

---

## 2. Ce qu'on emporte, et ce qu'on laisse

### On emporte

| Table | Lignes |
|---|---|
| `job_offers` | 471 |
| `candidatures` | 271 |
| `outreach_targets` | 157 |
| `cvtheque` | 112 |
| `observatoire_articles` | 12 |
| `comptes_entreprise` | 2 |
| `app_admins`, `candidats`, `job_alerts` | 1 chacune |
| `messages` | 0 (structure seule) |

Plus : **308 fichiers / 136 Mo** dans les buckets privés `cvs` et `cvtheque`,
et **4 comptes Auth réels**.

### On laisse derrière — c'est là tout l'intérêt de l'opération

| Objet | Pourquoi |
|---|---|
| `entreprises`, `ecoles`, `conseils` | template « stagiaires », 0 ligne |
| `contact_messages` | appartient à **vehiculeschinois.com**, 0 ligne |
| `avp_config`, `avp_pipeline_logs` | autre projet, 0 ligne |
| `cvs` (la **table**, pas le bucket) | inutilisée, 0 ligne |
| **4 comptes Auth orphelins** | comptes de test de juin/juillet, sans fiche associée |

Aucun `DROP` n'est exécuté sur la base vivante : ces objets ne sont simplement
jamais recréés. C'est ce qui rend le nettoyage gratuit et sans risque.

---

## 3. Procédure

### Étape 0 — préparation

1. Sauvegarde du projet source (Supabase → Database → Backups).
2. Créer le projet cible dans l'organisation **Souss-massa-rh**, région
   **`eu-central-2`** (identique à la source ; changer de région dégraderait les
   temps de réponse depuis le Maroc).
3. Autoriser le connecteur Supabase sur cette organisation.
4. Dans le projet cible : **Authentication → décocher « Confirm email »**.
   Sans ça, `signUp` ne renvoie pas de session et l'inscription entreprise casse.

### Étape 1 — schéma

1. Appliquer `000_baseline_job_offers_app_admins.sql`.
2. Rejouer les 34 migrations de `schema_migrations` **dans l'ordre des versions**,
   en sautant `create_contact_messages_vehiculeschinois` et
   `avp_create_video_pipeline_tables`.
3. Créer les buckets **privés** `cvs` et `cvtheque` (le script s'en charge).

**Contrôle :** 17 tables attendues moins 6 laissées = **11 tables**,
58 policies, 55 fonctions, 10 triggers.

### Étape 2 — comptes Auth

Les 4 comptes réels, **hachages de mots de passe compris**, pour que personne
n'ait à redéfinir son mot de passe. L'admin d'abord, et **tester sa connexion
avant d'aller plus loin** : sans admin, plus aucune modération n'est possible.

### Étape 3 — données

Dans l'ordre des dépendances :
`app_admins` → `comptes_entreprise` → `candidats` → `job_offers` →
`candidatures` → `cvtheque` → `job_alerts` → `observatoire_articles` →
`outreach_targets`.

> Désactiver temporairement les triggers de synchronisation pendant l'import,
> sinon `sync_candidature_to_cvtheque` recréerait des fiches CVthèque en double
> par-dessus celles qu'on importe.

### Étape 4 — fichiers

```bash
export SRC_URL='https://tqrhxhoqqktnhttzmoqt.supabase.co'
export SRC_KEY='<service_role SOURCE>'
export DST_URL='https://<nouveau-ref>.supabase.co'
export DST_KEY='<service_role CIBLE>'

node scripts/migrate-storage.cjs --dry-run   # inventaire
node scripts/migrate-storage.cjs             # copie (rejouable)
node scripts/migrate-storage.cjs --verify    # recompte les deux côtés
```

Les clés `service_role` restent dans ton terminal : elles ne doivent transiter
par aucune conversation.

### Étape 5 — vérifications avant bascule

- [ ] Comptes par table identiques des deux côtés
- [ ] `--verify` du script : 308 = 308
- [ ] Chaque `cvtheque.file_path` et chaque `candidatures.cv_path` résout sur la cible
- [ ] Connexion admin OK
- [ ] Connexion des 2 entreprises OK
- [ ] Advisor sécurité : aucune régression

### Étape 6 — bascule (heures creuses)

Fichiers portant l'URL et la clé anon en dur :

```
src/services/supabase.ts
api/sitemap.ts   api/robots.ts      api/prerender.ts   api/keepalive.ts
api/apply.ts     api/notify-company.ts   api/delete-company.ts
api/company-lead.ts  api/notify-application.ts  api/send-alerts.ts
scripts/_supabase.cjs   scripts/gen-sitemap.cjs   scripts/parse-cvtheque.ts
```

Plus, sur **Vercel** : `SUPABASE_SERVICE_ROLE_KEY` (et `CRON_SECRET` si posé).

### Étape 7 — après

- Garder le projet source **intact au moins deux semaines**.
- Ne le supprimer qu'après avoir vérifié qu'aucune donnée nouvelle n'y arrive.

---

## 4. Décision à trancher pendant la migration

**Faut-il appliquer `017_job_offers_lock_writes.sql` ?**

`job_offers` accepte aujourd'hui les écritures `anon` : la clé anon étant
publique, n'importe qui peut créer, modifier ou supprimer une offre. Le projet
neuf est le bon moment pour fermer ça — **mais seulement si les scripts d'import
utilisent `SUPABASE_SERVICE_ROLE_KEY`**, sinon le pipeline `/import-offres`
cesse de fonctionner. À décider explicitement, pas à subir.
