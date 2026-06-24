"""
Script Playwright pour automatiser la création d'ateliers SIGEC
et la prescription de candidats par lots de 15 (5 cycles de 3 CIN).

Usage:
    pip install playwright
    playwright install chromium
    python scripts/atelier_prescription.py [fichier_candidats.txt]

Le fichier candidats.txt contient un CIN par ligne.
"""

import time
import sys
import os
from playwright.sync_api import Playwright, sync_playwright

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION - Modifier ces valeurs selon vos besoins
# ═══════════════════════════════════════════════════════════════

CANDIDATS_FILE = "candidats.txt"
LIEU = "AGENCE AGADIR"
MAX_PER_ATELIER = 15
CIN_PER_CYCLE = 3

LOGIN_URL = "https://login.microsoftonline.com/c61d750e-fe12-4421-96ae-28036b59c33d/login"

THEMES = [
    "Préparer un entretien d'embauche",
    "Mettre en valeur ses compétences",
    "Moi et le marché de travail",
    "Je m'informe sur l'offre d'emploi pour augmenter mes chances d'insertion",
]

# Créneaux horaires à utiliser (on alterne pour éviter les conflits)
TIME_SLOTS = [
    (9, 0),
    (9, 30),
    (10, 0),
    (10, 30),
    (14, 0),
    (14, 30),
    (15, 0),
    (15, 30),
]

# Mois de départ pour les dates (juillet 2026)
START_MONTH = 7
START_YEAR = 2026

# Délais en secondes (augmenter si connexion lente)
DELAY_SHORT = 0.5
DELAY_MEDIUM = 1.0
DELAY_LONG = 2.0

# ═══════════════════════════════════════════════════════════════

MONTHS_FR = {
    "janvier": 1, "février": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "août": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12
}

MONTHS_FR_REVERSE = {v: k.capitalize() for k, v in MONTHS_FR.items()}


def load_candidats(filepath):
    """Charge les CIN depuis un fichier texte (un par ligne)."""
    if not os.path.exists(filepath):
        print(f"ERREUR: Fichier '{filepath}' introuvable.")
        sys.exit(1)
    with open(filepath, "r", encoding="utf-8") as f:
        cins = [line.strip() for line in f if line.strip()]
    if not cins:
        print("ERREUR: Le fichier candidats est vide.")
        sys.exit(1)
    return cins


def get_current_calendar_month(page):
    """Lit le mois/année courant du datepicker jQuery UI."""
    title = page.locator(".ui-datepicker-title").inner_text().strip()
    parts = title.split()
    month_name = parts[0].lower()
    year = int(parts[1])
    month = MONTHS_FR.get(month_name, 0)
    return month, year


def navigate_to_month(page, target_month, target_year):
    """Navigue le calendrier jQuery UI vers le mois/année cible."""
    for _ in range(36):
        current_month, current_year = get_current_calendar_month(page)
        current_total = current_year * 12 + current_month
        target_total = target_year * 12 + target_month
        if current_total == target_total:
            return
        elif current_total < target_total:
            page.get_by_title("Suiv>").click()
        else:
            page.get_by_title("<Préc").click()
        time.sleep(0.3)
    print("ATTENTION: Impossible de naviguer vers le mois cible.")


def create_atelier(page, theme, lieu, day, month, year, hour, minutes):
    """Crée un atelier avec les paramètres donnés."""
    # 1. Sélectionner le thème
    page.locator("#PrestationComboThemes").select_option(label=theme)
    time.sleep(DELAY_SHORT)

    # 2. Remplir le lieu
    page.locator("#PrestationComboLieu").click()
    page.locator("#PrestationComboLieu").fill("")
    time.sleep(0.2)
    page.locator("#PrestationComboLieu").fill(lieu)
    time.sleep(DELAY_SHORT)

    # 3. Sélectionner la date via le datepicker
    page.locator("#date").click()
    time.sleep(DELAY_SHORT)
    navigate_to_month(page, month, year)
    page.locator("#ui-datepicker-div").get_by_role(
        "link", name=str(day), exact=True
    ).click()
    time.sleep(DELAY_SHORT)

    # 4. Sélectionner l'heure
    page.locator("#test").click()
    time.sleep(DELAY_SHORT)

    # Sélectionner AM/PM
    if hour >= 12:
        page.locator("#PrestationSaveAtelierForm").get_by_text("pm", exact=True).click()
    else:
        page.locator("#PrestationSaveAtelierForm").get_by_text("am", exact=True).click()
    time.sleep(0.2)

    # Sélectionner l'heure (les boutons affichent 12-16 pour PM, ou l'heure exacte)
    page.locator("#PrestationSaveAtelierForm").get_by_text(
        str(hour), exact=True
    ).click()
    time.sleep(0.2)

    # Sélectionner les minutes
    min_str = f"{minutes:02d}" if minutes > 0 else "00"
    page.locator("#PrestationSaveAtelierForm").get_by_text(
        min_str, exact=True
    ).click()
    time.sleep(DELAY_SHORT)

    # 5. Enregistrer
    page.get_by_role("button", name="Enregistrer").click()
    page.wait_for_load_state("networkidle")
    time.sleep(DELAY_LONG)


def prescribe_cycle(page, cins):
    """Prescrit un cycle de 1 à 3 CIN via la modale."""
    # Cliquer sur le bouton prescrire du premier atelier (le plus récent, en haut)
    page.locator("#butcon").first.click()
    time.sleep(DELAY_MEDIUM)

    # Remplir les champs CIN
    for i, cin in enumerate(cins):
        field = page.locator(f"#PrestationComboCin{i + 1}")
        field.click()
        field.fill(cin)
        time.sleep(0.2)

    # Valider
    page.get_by_role("button", name="Valider").click()
    page.wait_for_load_state("networkidle")
    time.sleep(DELAY_MEDIUM)


def prescribe_all(page, cin_list):
    """Prescrit tous les CIN d'un atelier (jusqu'à 15) par cycles de 3."""
    total = len(cin_list)
    done = 0

    for i in range(0, total, CIN_PER_CYCLE):
        cycle = cin_list[i : i + CIN_PER_CYCLE]
        prescribe_cycle(page, cycle)
        done += len(cycle)
        print(f"    Cycle {i // CIN_PER_CYCLE + 1}: "
              f"{', '.join(cycle)} → total prescrits: {done}")


def compute_date_time(atelier_index):
    """Calcule la date et l'heure pour un atelier donné."""
    slot_index = atelier_index % len(TIME_SLOTS)
    day_offset = atelier_index // len(TIME_SLOTS)

    day = (day_offset % 28) + 1
    month_offset = day_offset // 28
    month = START_MONTH + month_offset
    year = START_YEAR

    while month > 12:
        month -= 12
        year += 1

    hour, minutes = TIME_SLOTS[slot_index]
    return day, month, year, hour, minutes


def run(playwright: Playwright, candidats_file: str, start_from: int = 0) -> None:
    candidats = load_candidats(candidats_file)
    print(f"Fichier: {candidats_file}")
    print(f"Total candidats: {len(candidats)}")

    # Découper en groupes de 15
    atelier_groups = []
    for i in range(0, len(candidats), MAX_PER_ATELIER):
        atelier_groups.append(candidats[i : i + MAX_PER_ATELIER])

    total_ateliers = len(atelier_groups)
    print(f"Total ateliers à créer: {total_ateliers}")
    print(f"Thèmes en rotation: {len(THEMES)}")

    if start_from > 0:
        print(f"Reprise à partir de l'atelier {start_from + 1}")

    # Lancer le navigateur
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(60000)

    # Connexion
    print("\nConnexion à SIGEC...")
    page.goto(LOGIN_URL)
    page.wait_for_load_state("networkidle")

    # Gérer le prompt "Rester connecté ?"
    print("En attente de l'authentification (max 2 min)...")
    try:
        page.get_by_role("button", name="Yes").click(timeout=120000)
    except Exception:
        print("Pas de bouton 'Yes', on continue...")

    page.wait_for_load_state("networkidle")
    time.sleep(DELAY_LONG)

    # Naviguer vers Créer atelier
    print("Navigation vers 'Créer atelier'...")
    page.get_by_role("link", name="Créer atelier").click()
    page.wait_for_load_state("networkidle")
    time.sleep(DELAY_LONG)

    # Log de progression
    log_file = "atelier_progress.log"
    print(f"Progression enregistrée dans: {log_file}\n")

    # Boucle principale
    for idx in range(start_from, total_ateliers):
        group = atelier_groups[idx]
        theme = THEMES[idx % len(THEMES)]
        day, month, year, hour, minutes = compute_date_time(idx)
        month_name = MONTHS_FR_REVERSE.get(month, "?")

        print(f"{'═' * 60}")
        print(f"Atelier {idx + 1}/{total_ateliers}")
        print(f"  Thème    : {theme}")
        print(f"  Date     : {day:02d} {month_name} {year}")
        print(f"  Heure    : {hour:02d}:{minutes:02d}")
        print(f"  Candidats: {len(group)}")
        print(f"  CINs     : {group[0]} ... {group[-1]}")

        try:
            # Créer l'atelier
            create_atelier(page, theme, LIEU, day, month, year, hour, minutes)
            print(f"  ✓ Atelier créé")

            # Prescrire les candidats
            prescribe_all(page, group)
            print(f"  ✓ {len(group)} candidats prescrits")

            # Log de progression
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(
                    f"OK | Atelier {idx + 1}/{total_ateliers} | "
                    f"{theme} | {day:02d}/{month:02d}/{year} {hour:02d}:{minutes:02d} | "
                    f"{len(group)} candidats | "
                    f"{group[0]}..{group[-1]}\n"
                )

        except Exception as e:
            error_msg = str(e)
            print(f"  ✗ ERREUR: {error_msg}")
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(
                    f"ERREUR | Atelier {idx + 1}/{total_ateliers} | "
                    f"{theme} | {error_msg}\n"
                )
            print(f"\n  Pour reprendre, relancez avec --start {idx}")
            print(f"  python scripts/atelier_prescription.py {candidats_file} --start {idx}")

            # Pause pour permettre intervention manuelle
            try:
                input("\n  Appuyez sur Entrée pour continuer, ou Ctrl+C pour arrêter...")
                # Recharger la page créer atelier
                page.get_by_role("link", name="Créer atelier").click()
                page.wait_for_load_state("networkidle")
                time.sleep(DELAY_LONG)
            except KeyboardInterrupt:
                print("\nArrêt par l'utilisateur.")
                break

    print(f"\n{'═' * 60}")
    print(f"TERMINÉ!")
    print(f"  Candidats traités: {len(candidats)}")
    print(f"  Ateliers créés: {total_ateliers}")
    print(f"  Voir le log: {log_file}")

    try:
        input("\nAppuyez sur Entrée pour fermer le navigateur...")
    except KeyboardInterrupt:
        pass

    context.close()
    browser.close()


if __name__ == "__main__":
    # Arguments en ligne de commande
    candidats_file = CANDIDATS_FILE
    start_from = 0

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--start" and i + 1 < len(args):
            start_from = int(args[i + 1])
            i += 2
        elif not args[i].startswith("--"):
            candidats_file = args[i]
            i += 1
        else:
            i += 1

    print("╔══════════════════════════════════════════════════════════╗")
    print("║  SIGEC - Création d'ateliers & Prescription automatique ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()

    with sync_playwright() as playwright:
        run(playwright, candidats_file, start_from)
