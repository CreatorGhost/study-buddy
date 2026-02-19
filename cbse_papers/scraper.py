#!/usr/bin/env python3
"""
CBSE Class 12 Board Paper Scraper (2015-2025)
Downloads question papers + marking schemes/solutions from:
  1. cbseacademic.nic.in  — official sample papers + marking schemes
  2. cbse.gov.in          — actual board papers (2022-2025, ZIP archives)
  3. selfstudys.com       — actual board papers with solutions (Playwright)
"""

import os
import re
import sys
import time
import json
import zipfile
import logging
import requests
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, quote
from concurrent.futures import ThreadPoolExecutor, as_completed

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "downloads"

SUBJECTS = {
    "Physics":          {"academic": "Physics",          "gov": "Physics"},
    "Chemistry":        {"academic": "Chemistry",        "gov": "Chemistry"},
    "Mathematics":      {"academic": "Maths",            "gov": "Mathematics"},
    "Biology":          {"academic": "Biology",           "gov": "Biology"},
    "English":          {"academic": "EnglishCore",       "gov": "English Core"},
    "Computer Science": {"academic": "ComputerScience",   "gov": "Computer Science"},
}

# Academic years mapped to the folder naming on cbseacademic.nic.in
ACADEMIC_YEARS = {
    2016: "ClassXII_2015_16",
    2017: "ClassXII_2016_17",
    2018: "ClassXII_2017_18",
    2019: "ClassXII_2018_19",
    2020: "ClassXII_2019_20",
    2021: "ClassXII_2020_21",
    2022: "ClassXII_2021_22",
    2023: "ClassXII_2022_23",
    2024: "ClassXII_2023_24",
    2025: "ClassXII_2024_25",
    2026: "ClassXII_2025_26",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("cbse_scraper")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def safe_download(url: str, dest: Path, timeout: int = 60) -> bool:
    """Download a file. Returns True on success."""
    if dest.exists() and dest.stat().st_size > 0:
        log.info("  SKIP (exists): %s", dest.name)
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, stream=True)
        if resp.status_code == 200 and len(resp.content) > 500:
            dest.write_bytes(resp.content)
            log.info("  OK: %s  (%d KB)", dest.name, len(resp.content) // 1024)
            return True
        else:
            log.warning("  FAIL (%s): %s", resp.status_code, url)
            return False
    except Exception as e:
        log.warning("  ERROR: %s — %s", url, e)
        return False


def extract_zip(zip_bytes: bytes, dest_dir: Path):
    """Extract a ZIP archive into dest_dir."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                fname = Path(info.filename).name
                if fname.lower().endswith(".pdf"):
                    target = dest_dir / fname
                    if not target.exists():
                        target.write_bytes(zf.read(info))
                        log.info("    Extracted: %s", fname)
    except zipfile.BadZipFile:
        log.warning("  Bad ZIP file for %s", dest_dir)


# ---------------------------------------------------------------------------
# Source 1: cbseacademic.nic.in — Sample Papers + Marking Schemes
# ---------------------------------------------------------------------------
def scrape_cbse_academic():
    """Download sample question papers and marking schemes from cbseacademic.nic.in"""
    log.info("=" * 60)
    log.info("SOURCE 1: cbseacademic.nic.in (Sample Papers + Marking Schemes)")
    log.info("=" * 60)

    base = "https://cbseacademic.nic.in/web_material/SQP"
    stats = {"ok": 0, "fail": 0}

    for exam_year, folder in ACADEMIC_YEARS.items():
        if exam_year < 2016 or exam_year > 2026:
            continue
        for subject, names in SUBJECTS.items():
            acad_name = names["academic"]
            dest_dir = DOWNLOAD_DIR / subject / f"{exam_year}_SamplePaper"
            dest_dir.mkdir(parents=True, exist_ok=True)

            # Try multiple URL patterns — CBSE has changed naming over the years
            sqp_candidates = [
                f"{base}/{folder}/{acad_name}-SQP.pdf",
                f"{base}/{folder}/{acad_name}_SQP.pdf",
                f"{base}/{folder}/{acad_name} SQP.pdf",
            ]
            ms_candidates = [
                f"{base}/{folder}/{acad_name}-MS.pdf",
                f"{base}/{folder}/{acad_name}_MS.pdf",
                f"{base}/{folder}/{acad_name} MS.pdf",
            ]

            sqp_ok = False
            for url in sqp_candidates:
                encoded = url.replace(" ", "%20")
                if safe_download(encoded, dest_dir / f"{subject}_SamplePaper_{exam_year}.pdf"):
                    sqp_ok = True
                    stats["ok"] += 1
                    break
            if not sqp_ok:
                stats["fail"] += 1

            ms_ok = False
            for url in ms_candidates:
                encoded = url.replace(" ", "%20")
                if safe_download(encoded, dest_dir / f"{subject}_MarkingScheme_{exam_year}.pdf"):
                    ms_ok = True
                    stats["ok"] += 1
                    break
            if not ms_ok:
                stats["fail"] += 1

            time.sleep(0.3)  # be polite

    log.info("cbseacademic.nic.in — Downloaded: %d, Failed: %d", stats["ok"], stats["fail"])
    return stats


# ---------------------------------------------------------------------------
# Source 2: cbse.gov.in — Actual Board Papers (ZIP archives, 2022-2025)
# ---------------------------------------------------------------------------
def scrape_cbse_gov():
    """Download actual board exam papers from cbse.gov.in (2022-2025)."""
    log.info("=" * 60)
    log.info("SOURCE 2: cbse.gov.in (Actual Board Papers 2022-2025)")
    log.info("=" * 60)

    base = "https://www.cbse.gov.in/cbsenew/question-paper"
    stats = {"ok": 0, "fail": 0}

    for year in range(2022, 2026):
        for subject, names in SUBJECTS.items():
            gov_name = names["gov"]
            dest_dir = DOWNLOAD_DIR / subject / f"{year}_BoardPaper"

            # Try ZIP download
            url = f"{base}/{year}/XII/{gov_name}.zip"
            encoded = url.replace(" ", "%20")

            try:
                resp = requests.get(encoded, headers=HEADERS, timeout=60)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    extract_zip(resp.content, dest_dir)
                    stats["ok"] += 1
                    log.info("  ZIP OK: %s %d", subject, year)
                else:
                    # Try direct PDF pattern
                    pdf_url = f"{base}/{year}/XII/{gov_name}.pdf"
                    encoded_pdf = pdf_url.replace(" ", "%20")
                    if safe_download(encoded_pdf, dest_dir / f"{subject}_BoardPaper_{year}.pdf"):
                        stats["ok"] += 1
                    else:
                        stats["fail"] += 1
                        log.warning("  No papers found: %s %d", subject, year)
            except Exception as e:
                stats["fail"] += 1
                log.warning("  ERROR: %s %d — %s", subject, year, e)

            time.sleep(0.5)

    log.info("cbse.gov.in — Downloaded: %d, Failed: %d", stats["ok"], stats["fail"])
    return stats


# ---------------------------------------------------------------------------
# Source 3: selfstudys.com — Board Papers with Solutions (Playwright)
# ---------------------------------------------------------------------------
def scrape_selfstudys():
    """Use Playwright to scrape selfstudys.com for board papers + solutions."""
    log.info("=" * 60)
    log.info("SOURCE 3: selfstudys.com (Board Papers + Solutions via Playwright)")
    log.info("=" * 60)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log.error("Playwright not installed. Skipping selfstudys.com")
        return {"ok": 0, "fail": 0}

    subject_slugs = {
        "Physics":          ("physics-pyp", "physics"),
        "Chemistry":        ("chemistry-pyp", "chemistry"),
        "Mathematics":      ("mathematics-pyp", "mathematics"),
        "Biology":          ("biology-pyp", "biology"),
        "English":          ("english-pyp", "english"),
        "Computer Science": ("computer-science-pyp", "computer-science"),
    }

    stats = {"ok": 0, "fail": 0}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=HEADERS["User-Agent"],
            accept_downloads=True,
        )
        page = context.new_page()

        # First, find the subject listing page to get correct URLs
        base_url = "https://www.selfstudys.com/books/cbse-prev-paper/english/class-12th"

        try:
            page.goto(base_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)
            log.info("Loaded selfstudys.com main page")
        except Exception as e:
            log.error("Failed to load selfstudys.com: %s", e)
            browser.close()
            return stats

        # Get all subject links from the page
        subject_links = {}
        try:
            links = page.query_selector_all("a")
            for link in links:
                href = link.get_attribute("href") or ""
                text = (link.inner_text() or "").strip().lower()
                for subject, (slug, _) in subject_slugs.items():
                    if slug in href.lower() or subject.lower() in text:
                        full_url = href if href.startswith("http") else f"https://www.selfstudys.com{href}"
                        subject_links[subject] = full_url
                        log.info("  Found link for %s: %s", subject, full_url)
        except Exception as e:
            log.warning("Error finding subject links: %s", e)

        # For each subject, navigate and find year-wise papers
        for subject, (slug, name_part) in subject_slugs.items():
            log.info("--- Processing %s ---", subject)
            subject_url = subject_links.get(
                subject,
                f"{base_url}/{slug}"
            )

            try:
                page.goto(subject_url, wait_until="domcontentloaded", timeout=30000)
                time.sleep(3)
            except Exception as e:
                log.warning("Failed to load %s page: %s", subject, e)
                stats["fail"] += 1
                continue

            # Look for year links or PDF download links
            try:
                all_links = page.query_selector_all("a")
                pdf_links = []
                for link in all_links:
                    href = link.get_attribute("href") or ""
                    text = (link.inner_text() or "").strip()
                    # Look for year-specific links (2015-2025)
                    for year in range(2015, 2026):
                        if str(year) in text or str(year) in href:
                            full_url = href if href.startswith("http") else f"https://www.selfstudys.com{href}"
                            pdf_links.append((year, text, full_url))

                log.info("  Found %d year-related links for %s", len(pdf_links), subject)

                # Try to navigate to each year and find downloadable PDFs
                visited_years = set()
                for year, text, url in pdf_links:
                    if year in visited_years:
                        continue
                    visited_years.add(year)

                    dest_dir = DOWNLOAD_DIR / subject / f"{year}_BoardPaper_Solutions"
                    dest_dir.mkdir(parents=True, exist_ok=True)

                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=30000)
                        time.sleep(2)

                        # Look for PDF download buttons/links
                        download_links = page.query_selector_all("a[href*='.pdf'], a[href*='download'], button:has-text('Download')")

                        for dl in download_links:
                            dl_href = dl.get_attribute("href") or ""
                            dl_text = (dl.inner_text() or "").strip()

                            if dl_href.endswith(".pdf") or "download" in dl_href.lower():
                                full_dl_url = dl_href if dl_href.startswith("http") else f"https://www.selfstudys.com{dl_href}"
                                fname = f"{subject}_{year}_{dl_text[:50].replace('/', '_').replace(' ', '_')}.pdf"
                                fname = re.sub(r'[^\w._-]', '_', fname)

                                if safe_download(full_dl_url, dest_dir / fname):
                                    stats["ok"] += 1
                                else:
                                    stats["fail"] += 1

                        # Also try to find embedded PDF viewer URLs
                        iframes = page.query_selector_all("iframe")
                        for iframe in iframes:
                            src = iframe.get_attribute("src") or ""
                            if ".pdf" in src:
                                pdf_url = src.split("?")[0] if "?" in src else src
                                fname = f"{subject}_{year}_paper.pdf"
                                if safe_download(pdf_url, dest_dir / fname):
                                    stats["ok"] += 1

                    except Exception as e:
                        log.warning("  Error processing %s %d: %s", subject, year, e)
                        stats["fail"] += 1

                    time.sleep(1)

            except Exception as e:
                log.warning("Error scraping %s: %s", subject, e)
                stats["fail"] += 1

        browser.close()

    log.info("selfstudys.com — Downloaded: %d, Failed: %d", stats["ok"], stats["fail"])
    return stats


# ---------------------------------------------------------------------------
# Source 4: Direct known PDF links (fallback / supplementary)
# ---------------------------------------------------------------------------
def scrape_direct_links():
    """Download from curated direct PDF links as a fallback."""
    log.info("=" * 60)
    log.info("SOURCE 4: Direct curated links (fallback)")
    log.info("=" * 60)

    # vedantu.com has well-known PDF URLs for CBSE papers
    vedantu_base = "https://www.vedantu.com/previous-year-question-paper"
    vedantu_subjects = {
        "Physics": "cbse-physics-question-paper-class-12",
        "Chemistry": "cbse-chemistry-question-paper-class-12",
        "Mathematics": "cbse-maths-question-paper-class-12",
        "Biology": "cbse-biology-question-paper-class-12",
        "English": "cbse-english-question-paper-class-12",
    }

    stats = {"ok": 0, "fail": 0}

    # Try vedantu PDFs with common patterns
    for subject, slug in vedantu_subjects.items():
        for year in range(2015, 2026):
            dest_dir = DOWNLOAD_DIR / subject / f"{year}_BoardPaper"
            dest_dir.mkdir(parents=True, exist_ok=True)

            urls_to_try = [
                f"https://www.vedantu.com/content/cbse/class-12/{subject.lower()}/previous-year-question-paper-{year}.pdf",
                f"https://www.vedantu.com/content/cbse/class-12/{subject.lower()}/question-paper-{year}.pdf",
            ]

            for url in urls_to_try:
                fname = f"{subject}_Vedantu_{year}.pdf"
                if safe_download(url, dest_dir / fname):
                    stats["ok"] += 1
                    break
            else:
                stats["fail"] += 1

            time.sleep(0.3)

    log.info("Direct links — Downloaded: %d, Failed: %d", stats["ok"], stats["fail"])
    return stats


# ---------------------------------------------------------------------------
# Summary report
# ---------------------------------------------------------------------------
def generate_report():
    """Print a summary of all downloaded files."""
    log.info("=" * 60)
    log.info("DOWNLOAD SUMMARY")
    log.info("=" * 60)

    total_files = 0
    total_size = 0

    for subject_dir in sorted(DOWNLOAD_DIR.iterdir()):
        if not subject_dir.is_dir():
            continue
        subject_files = 0
        subject_size = 0
        years = set()

        for year_dir in sorted(subject_dir.iterdir()):
            if not year_dir.is_dir():
                continue
            # Extract year from folder name
            match = re.search(r"(\d{4})", year_dir.name)
            if match:
                years.add(match.group(1))

            for f in year_dir.iterdir():
                if f.is_file() and f.suffix.lower() == ".pdf":
                    subject_files += 1
                    subject_size += f.stat().st_size

        total_files += subject_files
        total_size += subject_size
        years_str = ", ".join(sorted(years)) if years else "none"
        log.info(
            "  %-20s  %3d PDFs  (%5.1f MB)  Years: %s",
            subject_dir.name,
            subject_files,
            subject_size / (1024 * 1024),
            years_str,
        )

    log.info("-" * 60)
    log.info("  TOTAL: %d PDFs  (%.1f MB)", total_files, total_size / (1024 * 1024))
    log.info("  Location: %s", DOWNLOAD_DIR)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    log.info("CBSE Class 12 Paper Scraper — Starting")
    log.info("Target: Physics, Chemistry, Math, Biology, English, Computer Science")
    log.info("Years: 2015 — 2025")
    log.info("Output: %s", DOWNLOAD_DIR)
    log.info("")

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    all_stats = {}

    # Source 1: Official CBSE Academic (sample papers + marking schemes)
    all_stats["cbseacademic"] = scrape_cbse_academic()

    # Source 2: cbse.gov.in (actual board papers 2022-2025)
    all_stats["cbse_gov"] = scrape_cbse_gov()

    # Source 3: selfstudys.com (Playwright-based)
    all_stats["selfstudys"] = scrape_selfstudys()

    # Generate summary
    generate_report()

    # Save stats
    stats_file = DOWNLOAD_DIR / "download_stats.json"
    stats_file.write_text(json.dumps(all_stats, indent=2))
    log.info("Stats saved to %s", stats_file)


if __name__ == "__main__":
    main()
