Search for and publish new job offers from Souss-Massa region to the baddane/souss-massa-17-02 repository (main branch, auto-deployed via Vercel).

Follow the exact pipeline documented in IMPORT_OFFRES.md and CLAUDE.md:

1. Scrape new offers:
   - Run `node scripts/scrape-rekrute.cjs`
   - Run `node scripts/scrape-marocannonces.cjs`
   (Both write deduplicated results to scripts/import/pending-*.json). Skip emploi.ma (unreachable, Cloudflare). If a scraper fails, continue with the other and report the failure.

2. Deduplication: Fetch existing ref_offre and slug values from Supabase. Keep only truly new offers; never insert a duplicate ref_offre or slug.

3. For each new offer:
   - Write a clean French description if the original is short or in Arabic.
   - Enrich SEO: meta_description (≤160 chars), seo_keywords, required_skills, suggested_salary_range.
   - Generate a unique slug.
   - Translate to English (_en columns) and Arabic (_ar columns).
   - Insert into Supabase with all fields populated.

4. Commit and push to main with a clear message (e.g., "Add 5 new job offers from Rekrute and MarocAnnonces").

If no new offers are found, confirm briefly.

En résumé : Exécute le pipeline d'import des offres Souss-Massa via /import-offres : scrape rekrute + marocannonces, dédoublonne par ref_offre/slug, traduis FR/EN/AR + enrichis le SEO, valide les dates au format YYYY-MM-DD, insère dans Supabase, régénère public/sitemap.xml, puis commit et push sur main. Termine par un rapport : offres trouvées / insérées / ignorées par source. Si aucune nouvelle offre, ne commit rien.
Always push directly to the main branch.

── 4. VALIDATION (bloquant, économe en tokens) ──
- Vérifie le frontmatter et les liens internes.
- Lance le build SANS ingérer les logs :
    npm run build > /tmp/build.log 2>&1 && echo "BUILD_OK" || (echo "BUILD_FAIL"; tail -n 30 /tmp/build.log)
  Ne lis le log QUE si "BUILD_FAIL". Ne pousse jamais un build cassé.
