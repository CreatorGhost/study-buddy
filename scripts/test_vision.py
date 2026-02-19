"""Test Claude vision on page 1 of Physics 2024 paper — outputs raw markdown."""
import anthropic
import base64
import os

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

pdf_path = "data/pdfs/physics/physics_2024_solved.pdf"
with open(pdf_path, "rb") as f:
    pdf_b64 = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_b64,
                    },
                    # Only send first 5 pages to limit cost
                    "cache_control": {"type": "ephemeral"},
                },
                {
                    "type": "text",
                    "text": (
                        "Convert ONLY the first page of this PDF to markdown. "
                        "Preserve all question text, options, answers, and formatting exactly as they appear. "
                        "Use markdown formatting (headings, bold, lists). "
                        "For math formulas use LaTeX notation. "
                        "Output ONLY the markdown, no commentary."
                    ),
                },
            ],
        }
    ],
)

text = "".join(
    block.text for block in response.content if block.type == "text"
)

with open("data/parsed/test_vision_physics_2024.md", "w") as f:
    f.write(text)

print("=== CLAUDE VISION OUTPUT (page 1) ===\n")
print(text[:3000])
print(f"\n\n=== Total length: {len(text)} chars ===")
print(f"=== Input tokens: {response.usage.input_tokens}, Output tokens: {response.usage.output_tokens} ===")
