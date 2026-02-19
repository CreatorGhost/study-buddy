"""Test docling on Physics 2024 paper — Standard pipeline only first."""
import sys
import time
import os

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

print("Starting docling test...", flush=True)

PDF_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "pdfs", "physics", "physics_2024_solved.pdf")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "parsed")

print(f"PDF: {PDF_PATH}", flush=True)
print(f"File exists: {os.path.exists(PDF_PATH)}", flush=True)

# --- Standard Pipeline (simpler, no VLM model download needed) ---
print("\nImporting docling...", flush=True)
from docling.document_converter import DocumentConverter
print("Import done.", flush=True)

print("\nCreating converter (default standard pipeline)...", flush=True)
converter = DocumentConverter()
print("Converter ready.", flush=True)

print(f"\nConverting PDF...", flush=True)
t0 = time.time()
result = converter.convert(PDF_PATH)
t1 = time.time()
print(f"Conversion done in {t1-t0:.1f}s", flush=True)

print("\nExporting to markdown...", flush=True)
md = result.document.export_to_markdown()
print(f"Markdown length: {len(md)} chars", flush=True)

out_path = os.path.join(OUTPUT_DIR, "test_docling_standard.md")
with open(out_path, "w") as f:
    f.write(md)
print(f"Saved to: {out_path}", flush=True)

print("\n" + "=" * 60, flush=True)
print("FIRST 3000 CHARS:", flush=True)
print("=" * 60, flush=True)
print(md[:3000], flush=True)
print(f"\nTotal: {len(md)} chars in {t1-t0:.1f}s", flush=True)
