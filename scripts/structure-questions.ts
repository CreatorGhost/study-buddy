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

// Marks categories per subject
const MARKS_BY_SUBJECT: Record<string, number[]> = {
  physics: [1, 2, 3, 5],
  chemistry: [1, 2, 3, 5],
  biology: [1, 2, 3, 5],
  'computer-science': [1, 2, 3, 5],
  mathematics: [1, 4, 6],
};

interface StructuredQuestion {
  id: string;
  questionNumber: number;
  section: string;
  type: string;
  question: string;
  options: string[] | null;
  correctAnswer: string;
  solution: string;
  marks: number;
  topic: string | null;
  hasAlternative: boolean;
  alternativeQuestion: {
    question: string;
    options: string[] | null;
    correctAnswer: string;
    solution: string;
    topic: string | null;
  } | null;
}

interface PaperExtraction {
  year: number;
  setCode: string | null;
  totalMarks: number;
  duration: number;
  questions: StructuredQuestion[];
}

const STRUCTURING_PROMPT = `You are a CBSE exam paper structurer. Given a markdown version of a solved CBSE Class 12 question paper, extract every question into structured JSON.

RULES:
1. Extract EVERY question — do not skip any
2. For MCQs, list all options as an array: ["(a) ...", "(b) ...", "(c) ...", "(d) ..."]
3. For non-MCQ questions, set options to null
4. Include the correct answer and full solution/explanation text
5. Identify section (A, B, C, D, E) and marks per question
6. Classify question type: "mcq", "assertion-reasoning", "short-answer", "long-answer", "case-based", "fill-blank", "true-false", "coding"
7. Try to identify the chapter/topic for each question (e.g., "Electromagnetic Induction", "Optics", "Matrices")
8. For "Or" alternative questions, set hasAlternative: true and include the alternative in alternativeQuestion
9. Preserve LaTeX math notation exactly as-is
10. Generate an id for each question using format: {subject_key}_{year}_q{number} (e.g., physics_2024_q1)

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "year": 2024,
  "setCode": "55/1/1" or null,
  "totalMarks": 70,
  "duration": 180,
  "questions": [
    {
      "id": "physics_2024_q1",
      "questionNumber": 1,
      "section": "A",
      "type": "mcq",
      "question": "full question text with LaTeX",
      "options": ["(a) option1", "(b) option2", "(c) option3", "(d) option4"],
      "correctAnswer": "(b) option2",
      "solution": "detailed solution text",
      "marks": 1,
      "topic": "Electromagnetic Induction",
      "hasAlternative": false,
      "alternativeQuestion": null
    }
  ]
}`;

async function structureMarkdown(
  markdownPath: string,
  subject: string,
  subjectKey: string
): Promise<PaperExtraction> {
  const markdown = fs.readFileSync(markdownPath, 'utf-8');

  console.log(`  Sending to Claude API (${(markdown.length / 1024).toFixed(1)}KB of markdown)...`);

  let text = '';
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 64000,
    messages: [
      {
        role: 'user',
        content: `This is a markdown version of a CBSE Class 12 ${subject} solved question paper. The subject key for IDs is "${subjectKey}".\n\n${STRUCTURING_PROMPT}\n\n---\n\n${markdown}`,
      },
    ],
  });

  const finalMessage = await stream.finalMessage();
  text = finalMessage.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('');

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to extract JSON from response for ${markdownPath}`);
  }

  return JSON.parse(jsonMatch[0]) as PaperExtraction;
}

interface MarksFile {
  subject: string;
  marks: number;
  totalQuestions: number;
  questions: Array<StructuredQuestion & { year: number; paperId: string }>;
}

interface SubjectMetadata {
  subject: string;
  years: number[];
  markCategories: number[];
  papers: Array<{
    id: string;
    year: number;
    setCode: string | null;
    totalMarks: number;
    duration: number;
    questionCount: number;
  }>;
  totalQuestions: number;
}

async function processSubject(subjectKey: string, singlePaper?: string): Promise<SubjectMetadata | null> {
  const subject = SUBJECT_MAP[subjectKey];
  if (!subject) {
    console.error(`Unknown subject: ${subjectKey}`);
    return null;
  }

  const rawDir = path.join(__dirname, '..', 'data', 'parsed', 'raw', subjectKey);
  const outputDir = path.join(__dirname, '..', 'data', 'parsed', 'structured', subjectKey);

  if (!fs.existsSync(rawDir)) {
    console.log(`No raw markdown directory for ${subject}, skipping. Run parse-pdfs.ts first.`);
    return null;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  let mdFiles = fs.readdirSync(rawDir).filter((f) => f.endsWith('.md'));
  if (singlePaper) {
    mdFiles = mdFiles.filter((f) => f.includes(singlePaper));
  }

  if (mdFiles.length === 0) {
    console.log(`  No markdown files found for ${subject}`);
    return null;
  }

  console.log(`\nProcessing ${subject}: ${mdFiles.length} paper(s)`);

  // Collect all questions grouped by marks
  const questionsByMarks: Record<number, Array<StructuredQuestion & { year: number; paperId: string }>> = {};
  const markCategories = MARKS_BY_SUBJECT[subjectKey] || [1, 2, 3, 5];
  for (const m of markCategories) {
    questionsByMarks[m] = [];
  }

  const paperMetadata: SubjectMetadata['papers'] = [];
  const years: number[] = [];

  for (const mdFile of mdFiles) {
    const mdPath = path.join(rawDir, mdFile);
    const year = parseInt(mdFile.replace('.md', ''));
    const paperId = `${subjectKey}_${year}`;

    console.log(`  Structuring ${mdFile}...`);

    try {
      const extraction = await structureMarkdown(mdPath, subject, subjectKey);

      paperMetadata.push({
        id: paperId,
        year: extraction.year || year,
        setCode: extraction.setCode,
        totalMarks: extraction.totalMarks,
        duration: extraction.duration,
        questionCount: extraction.questions.length,
      });

      years.push(extraction.year || year);

      // Group questions by marks
      for (const q of extraction.questions) {
        const marksKey = q.marks;
        // Find closest marks category
        const category = markCategories.reduce((prev, curr) =>
          Math.abs(curr - marksKey) < Math.abs(prev - marksKey) ? curr : prev
        );

        if (!questionsByMarks[category]) {
          questionsByMarks[category] = [];
        }

        questionsByMarks[category].push({
          ...q,
          year: extraction.year || year,
          paperId,
        });
      }

      console.log(`  Extracted ${extraction.questions.length} questions from ${year}`);
    } catch (error) {
      console.error(`  Failed to structure ${mdFile}:`, error);
    }
  }

  // Write marks-grouped JSON files
  let totalQuestions = 0;
  for (const marks of markCategories) {
    const questions = questionsByMarks[marks] || [];
    if (questions.length === 0) continue;

    const marksFile: MarksFile = {
      subject,
      marks,
      totalQuestions: questions.length,
      questions: questions.sort((a, b) => b.year - a.year),
    };

    const outputFile = path.join(outputDir, `${marks}-mark.json`);
    fs.writeFileSync(outputFile, JSON.stringify(marksFile, null, 2));
    console.log(`  Wrote ${marks}-mark.json (${questions.length} questions)`);
    totalQuestions += questions.length;
  }

  // Write subject metadata
  const metadata: SubjectMetadata = {
    subject,
    years: years.sort((a, b) => b - a),
    markCategories,
    papers: paperMetadata.sort((a, b) => b.year - a.year),
    totalQuestions,
  };

  fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  console.log(`  Wrote metadata.json (${years.length} papers, ${totalQuestions} total questions)`);

  return metadata;
}

function buildMasterIndex(allMetadata: SubjectMetadata[]): void {
  const indexDir = path.join(__dirname, '..', 'data', 'parsed', 'structured');

  const index = {
    generatedAt: new Date().toISOString(),
    subjects: allMetadata.map((m) => ({
      name: m.subject,
      years: m.years,
      markCategories: m.markCategories,
      totalPapers: m.papers.length,
      totalQuestions: m.totalQuestions,
    })),
    totalPapers: allMetadata.reduce((s, m) => s + m.papers.length, 0),
    totalQuestions: allMetadata.reduce((s, m) => s + m.totalQuestions, 0),
  };

  fs.writeFileSync(path.join(indexDir, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`\nMaster index: ${index.totalPapers} papers, ${index.totalQuestions} questions`);
}

function printUsage(): void {
  console.log(`
Usage: npx tsx scripts/structure-questions.ts [options]

Options:
  --subject <name>    Process only one subject
  --paper <pattern>   Process only papers matching pattern (e.g., "2024")
  --dry-run           Show what would be processed without calling API
  --help              Show this help

Examples:
  npx tsx scripts/structure-questions.ts --dry-run
  npx tsx scripts/structure-questions.ts --subject physics --paper 2024
  npx tsx scripts/structure-questions.ts --subject physics
  npx tsx scripts/structure-questions.ts
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

  console.log('CBSE PYQ Structurer — Step 2: Markdown to Structured JSON');
  console.log('==========================================================\n');

  const subjects = targetSubject ? [targetSubject] : Object.keys(SUBJECT_MAP);

  if (dryRun) {
    console.log('DRY RUN — No API calls will be made\n');
    let totalFiles = 0;

    for (const subjectKey of subjects) {
      const rawDir = path.join(__dirname, '..', 'data', 'parsed', 'raw', subjectKey);
      if (!fs.existsSync(rawDir)) {
        console.log(`${SUBJECT_MAP[subjectKey]}: No raw markdown files (run parse-pdfs.ts first)`);
        continue;
      }

      let mdFiles = fs.readdirSync(rawDir).filter((f) => f.endsWith('.md'));
      if (targetPaper) mdFiles = mdFiles.filter((f) => f.includes(targetPaper));

      console.log(`${SUBJECT_MAP[subjectKey]}: ${mdFiles.length} file(s)`);
      for (const f of mdFiles) {
        const size = fs.statSync(path.join(rawDir, f)).size;
        console.log(`  ${f} (${(size / 1024).toFixed(1)}KB)`);
      }
      totalFiles += mdFiles.length;
    }

    console.log(`\nTotal files to process: ${totalFiles}`);
    console.log(`Estimated cost: ~$${(totalFiles * 0.12).toFixed(2)} (${totalFiles} API calls)`);
    return;
  }

  const allMetadata: SubjectMetadata[] = [];
  for (const subjectKey of subjects) {
    const metadata = await processSubject(subjectKey, targetPaper);
    if (metadata) allMetadata.push(metadata);
  }

  if (allMetadata.length > 0) {
    buildMasterIndex(allMetadata);
  }

  console.log('\nDone!');
}

main().catch(console.error);
