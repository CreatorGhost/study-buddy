import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const client = new Anthropic();

const SUBJECT_MAP: Record<string, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  mathematics: 'Mathematics',
  biology: 'Biology',
  'computer-science': 'Computer Science',
};

const RAW_MARKDOWN_PROMPT = `Convert this entire solved CBSE Class 12 question paper into clean, well-structured markdown.

RULES:
1. Preserve ALL content: every question, every option, every answer, every solution/explanation
2. Use clear section headers: ## Section A (1 mark each), ## Section B (2 marks each), etc.
3. Number questions exactly as they appear in the paper
4. For MCQs, list options as (a), (b), (c), (d) on separate lines
5. Mark answers clearly with **Answer:** followed by the correct option/value
6. Mark solutions/explanations with **Solution:** followed by the full explanation
7. For "Or" alternative questions, use "**OR**" on its own line between the main question and alternative
8. Use LaTeX notation for ALL math formulas: inline $...$ and display $$...$$
9. Use standard notation for chemical formulas (H₂O, NaOH, etc.)
10. Preserve any diagrams by describing them in [Diagram: description] format
11. Include paper metadata at the top: year, set code, total marks, duration
12. Keep the original question numbering (Q1, Q2, etc.)

OUTPUT FORMAT:
# [Subject] CBSE Class 12 Board Exam [Year]
**Set Code:** [if available]
**Total Marks:** [marks]
**Duration:** [duration]

## Section A — [marks] mark(s) each
### Q1.
[question text]
(a) option1
(b) option2
(c) option3
(d) option4

**Answer:** (b) option2
**Solution:** [explanation]

---

### Q2.
[continue...]`;

async function parsePDFToMarkdown(pdfPath: string, subject: string): Promise<string> {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64PDF = pdfBuffer.toString('base64');

  console.log(`  Sending to Claude API (${(pdfBuffer.length / 1024).toFixed(0)}KB)...`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64PDF,
            },
          },
          {
            type: 'text',
            text: `This is a CBSE Class 12 ${subject} solved question paper.\n\n${RAW_MARKDOWN_PROMPT}`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('');

  return text;
}

function extractYear(filename: string): string {
  const yearMatch = filename.match(/(\d{4})/);
  return yearMatch ? yearMatch[1] : filename.replace('.pdf', '');
}

async function processSubject(subjectKey: string, singlePaper?: string): Promise<number> {
  const subject = SUBJECT_MAP[subjectKey];
  if (!subject) {
    console.error(`Unknown subject: ${subjectKey}`);
    return 0;
  }

  const pdfsDir = path.join(__dirname, '..', 'data', 'pdfs', subjectKey);
  const outputDir = path.join(__dirname, '..', 'data', 'parsed', 'raw', subjectKey);

  if (!fs.existsSync(pdfsDir)) {
    console.log(`No PDFs directory for ${subject}, skipping.`);
    return 0;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  let pdfFiles = fs.readdirSync(pdfsDir).filter((f) => f.endsWith('.pdf'));

  if (singlePaper) {
    pdfFiles = pdfFiles.filter((f) => f.includes(singlePaper));
    if (pdfFiles.length === 0) {
      console.log(`  No PDF matching "${singlePaper}" found in ${subject}`);
      return 0;
    }
  }

  console.log(`\nProcessing ${subject}: ${pdfFiles.length} paper(s)`);

  let processed = 0;
  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(pdfsDir, pdfFile);
    const year = extractYear(pdfFile);
    const outputFile = path.join(outputDir, `${year}.md`);

    // Skip if already parsed
    if (fs.existsSync(outputFile)) {
      console.log(`  Skipping ${pdfFile} (already parsed)`);
      continue;
    }

    console.log(`  Parsing ${pdfFile}...`);

    try {
      const markdown = await parsePDFToMarkdown(pdfPath, subject);
      fs.writeFileSync(outputFile, markdown);
      console.log(`  Saved to ${path.relative(process.cwd(), outputFile)} (${markdown.length} chars)`);
      processed++;
    } catch (error) {
      console.error(`  Failed to parse ${pdfFile}:`, error);
    }
  }

  return processed;
}

function printUsage(): void {
  console.log(`
Usage: npx tsx scripts/parse-pdfs.ts [options]

Options:
  --subject <name>    Parse only one subject (physics, chemistry, mathematics, biology, computer-science)
  --paper <pattern>   Parse only papers matching pattern (e.g., "2024")
  --dry-run           Show what would be parsed without calling API
  --help              Show this help

Examples:
  npx tsx scripts/parse-pdfs.ts --dry-run                     # Preview all papers
  npx tsx scripts/parse-pdfs.ts --subject physics --paper 2024 # Parse one paper
  npx tsx scripts/parse-pdfs.ts --subject physics              # Parse all physics papers
  npx tsx scripts/parse-pdfs.ts                                # Parse everything
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    printUsage();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const subjectIdx = args.indexOf('--subject');
  const paperIdx = args.indexOf('--paper');
  const targetSubject = subjectIdx >= 0 ? args[subjectIdx + 1] : undefined;
  const targetPaper = paperIdx >= 0 ? args[paperIdx + 1] : undefined;

  console.log('CBSE PYQ Paper Parser — Step 1: PDF to Markdown');
  console.log('================================================\n');

  const subjects = targetSubject ? [targetSubject] : Object.keys(SUBJECT_MAP);

  if (dryRun) {
    console.log('DRY RUN — No API calls will be made\n');
    let totalPapers = 0;

    for (const subjectKey of subjects) {
      const pdfsDir = path.join(__dirname, '..', 'data', 'pdfs', subjectKey);
      const outputDir = path.join(__dirname, '..', 'data', 'parsed', 'raw', subjectKey);

      if (!fs.existsSync(pdfsDir)) continue;

      let pdfFiles = fs.readdirSync(pdfsDir).filter((f) => f.endsWith('.pdf'));
      if (targetPaper) pdfFiles = pdfFiles.filter((f) => f.includes(targetPaper));

      console.log(`${SUBJECT_MAP[subjectKey]}:`);
      for (const pdfFile of pdfFiles) {
        const year = extractYear(pdfFile);
        const outputFile = path.join(outputDir, `${year}.md`);
        const exists = fs.existsSync(outputFile);
        console.log(`  ${pdfFile} → ${year}.md ${exists ? '(already exists, will skip)' : '(will parse)'}`);
        if (!exists) totalPapers++;
      }
    }

    console.log(`\nTotal papers to parse: ${totalPapers}`);
    console.log(`Estimated cost: ~$${(totalPapers * 0.12).toFixed(2)} (${totalPapers} API calls)`);
    return;
  }

  let totalProcessed = 0;
  for (const subjectKey of subjects) {
    totalProcessed += await processSubject(subjectKey, targetPaper);
  }

  console.log(`\nDone! Processed ${totalProcessed} paper(s).`);
}

main().catch(console.error);
