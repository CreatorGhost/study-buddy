import * as fs from 'fs';
import * as path from 'path';

/**
 * Fix structured PYQ data:
 * 1. Fix 2025 paper years (chemistry, mathematics, biology had year:2024 for 2025 papers)
 * 2. Fix marks bucketing (questions were in wrong category files)
 * 3. Fix null correctAnswer (default to "See solution")
 * 4. Rebuild metadata.json per subject
 * 5. Rebuild index.json
 *
 * NO API calls — purely local JSON manipulation.
 */

const SUBJECT_MAP: Record<string, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  mathematics: 'Mathematics',
  biology: 'Biology',
  'computer-science': 'Computer Science',
};

const MARKS_BY_SUBJECT: Record<string, number[]> = {
  physics: [1, 2, 3, 5],
  chemistry: [1, 2, 3, 5],
  biology: [1, 2, 3, 5],
  'computer-science': [1, 2, 3, 5],
  mathematics: [1, 4, 6],
};

interface Question {
  id: string;
  questionNumber: number | string;
  section: string;
  type: string;
  question: string;
  options: string[] | null;
  correctAnswer: string | null;
  solution: string | null;
  marks: number;
  topic: string | null;
  hasAlternative: boolean;
  alternativeQuestion: Record<string, unknown> | null;
  year: number;
  paperId: string;
}

interface MarksFile {
  subject: string;
  marks: number;
  totalQuestions: number;
  questions: Question[];
}

const structuredDir = path.join(__dirname, '..', 'data', 'parsed', 'structured');

// Papers whose year needs fixing: paperId contains _2025 but year was set to 2024
const YEAR_FIX_PAPERS = new Set([
  'chemistry_2025',
  'mathematics_2025',
  'biology_2025',
]);

function loadAllQuestions(subjectKey: string): Question[] {
  const subjectDir = path.join(structuredDir, subjectKey);
  const allQuestions: Question[] = [];

  // Read all mark files
  const files = fs.readdirSync(subjectDir).filter(f => f.endsWith('-mark.json'));
  for (const file of files) {
    const data: MarksFile = JSON.parse(fs.readFileSync(path.join(subjectDir, file), 'utf-8'));
    allQuestions.push(...data.questions);
  }

  return allQuestions;
}

function fixYearAndIds(questions: Question[]): { fixed: number } {
  let fixed = 0;
  for (const q of questions) {
    if (YEAR_FIX_PAPERS.has(q.paperId) && q.year === 2024) {
      q.year = 2025;
      // Fix ID: change e.g. chemistry_2024_q1 → chemistry_2025_q1
      q.id = q.id.replace(/_2024_/, '_2025_');
      fixed++;
    }
  }
  return { fixed };
}

function fixNullCorrectAnswer(questions: Question[]): { fixed: number } {
  let fixed = 0;
  for (const q of questions) {
    if (!q.correctAnswer) {
      q.correctAnswer = 'See solution';
      fixed++;
    }
    if (!q.solution) {
      q.solution = 'No solution provided';
      fixed++;
    }
  }
  return { fixed };
}

function deduplicateQuestions(questions: Question[]): { removed: number; deduped: Question[] } {
  const seen = new Set<string>();
  const deduped: Question[] = [];
  let removed = 0;

  for (const q of questions) {
    if (seen.has(q.id)) {
      removed++;
      continue;
    }
    seen.add(q.id);
    deduped.push(q);
  }

  return { removed, deduped };
}

function bucketByMarks(questions: Question[], markCategories: number[]): Record<number, Question[]> {
  const buckets: Record<number, Question[]> = {};
  for (const m of markCategories) {
    buckets[m] = [];
  }

  for (const q of questions) {
    const actualMarks = typeof q.marks === 'number' ? q.marks : 1;

    // Find exact match first
    if (markCategories.includes(actualMarks)) {
      buckets[actualMarks].push(q);
    } else {
      // Find closest category
      const closest = markCategories.reduce((prev, curr) =>
        Math.abs(curr - actualMarks) < Math.abs(prev - actualMarks) ? curr : prev
      );
      buckets[closest].push(q);
    }
  }

  return buckets;
}

function processSubject(subjectKey: string): {
  subject: string;
  totalQuestions: number;
  yearsFix: number;
  answersFix: number;
  duplicatesRemoved: number;
  papers: Array<{
    id: string;
    year: number;
    setCode: string | null;
    totalMarks: number;
    duration: number;
    questionCount: number;
  }>;
  years: number[];
  markCategories: number[];
} {
  const subject = SUBJECT_MAP[subjectKey];
  const subjectDir = path.join(structuredDir, subjectKey);
  const markCategories = MARKS_BY_SUBJECT[subjectKey];

  console.log(`\n=== ${subject} ===`);

  // Load existing metadata for paper info
  const metadataPath = path.join(subjectDir, 'metadata.json');
  const existingMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  // Load all questions from all marks files
  const allQuestions = loadAllQuestions(subjectKey);
  console.log(`  Loaded ${allQuestions.length} questions`);

  // Fix 1: Year and IDs for 2025 papers
  const yearResult = fixYearAndIds(allQuestions);
  console.log(`  Fixed years: ${yearResult.fixed} questions`);

  // Fix 2: Null correctAnswer
  const answerResult = fixNullCorrectAnswer(allQuestions);
  console.log(`  Fixed null answers: ${answerResult.fixed} questions`);

  // Fix 3: Deduplicate
  const { removed, deduped } = deduplicateQuestions(allQuestions);
  console.log(`  Removed duplicates: ${removed} questions`);
  console.log(`  After dedup: ${deduped.length} questions`);

  // Fix 4: Re-bucket by actual marks value
  const buckets = bucketByMarks(deduped, markCategories);

  // Write corrected marks files
  for (const marks of markCategories) {
    const questions = buckets[marks] || [];
    if (questions.length === 0) {
      // Remove empty file if it exists
      const filePath = path.join(subjectDir, `${marks}-mark.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`  Deleted empty ${marks}-mark.json`);
      }
      continue;
    }

    // Sort by year desc, then question number asc
    questions.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const aNum = typeof a.questionNumber === 'string'
        ? parseInt(String(a.questionNumber).replace(/[^0-9]/g, '')) || 0
        : a.questionNumber;
      const bNum = typeof b.questionNumber === 'string'
        ? parseInt(String(b.questionNumber).replace(/[^0-9]/g, '')) || 0
        : b.questionNumber;
      return aNum - bNum;
    });

    const marksFile: MarksFile = {
      subject,
      marks,
      totalQuestions: questions.length,
      questions,
    };

    fs.writeFileSync(
      path.join(subjectDir, `${marks}-mark.json`),
      JSON.stringify(marksFile, null, 2)
    );
    console.log(`  Wrote ${marks}-mark.json (${questions.length} questions)`);
  }

  // Fix 5: Rebuild metadata
  // Fix paper metadata years too
  const papers = existingMetadata.papers.map((p: Record<string, unknown>) => {
    const paper = { ...p };
    if (YEAR_FIX_PAPERS.has(paper.id as string) && paper.year === 2024) {
      paper.year = 2025;
    }
    // Fix null totalMarks/duration
    if (!paper.totalMarks) {
      paper.totalMarks = subject === 'Mathematics' ? 100 : 70;
    }
    if (!paper.duration) {
      paper.duration = 180;
    }
    // Recount questions for this paper
    paper.questionCount = deduped.filter(q => q.paperId === paper.id).length;
    return paper;
  });

  // Sort papers by year desc
  papers.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
    (b.year as number) - (a.year as number)
  );

  const years = Array.from<number>(new Set(papers.map((p: Record<string, unknown>) => p.year as number))).sort((a, b) => b - a);

  const metadata = {
    subject,
    years,
    markCategories,
    papers,
    totalQuestions: deduped.length,
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`  Wrote metadata.json (${years.length} years, ${deduped.length} questions)`);

  return {
    subject,
    totalQuestions: deduped.length,
    yearsFix: yearResult.fixed,
    answersFix: answerResult.fixed,
    duplicatesRemoved: removed,
    papers,
    years,
    markCategories,
  };
}

function buildMasterIndex(allResults: ReturnType<typeof processSubject>[]): void {
  const index = {
    generatedAt: new Date().toISOString(),
    subjects: allResults.map(r => ({
      name: r.subject,
      years: r.years,
      markCategories: r.markCategories,
      totalPapers: r.papers.length,
      totalQuestions: r.totalQuestions,
    })),
    totalPapers: allResults.reduce((s, r) => s + r.papers.length, 0),
    totalQuestions: allResults.reduce((s, r) => s + r.totalQuestions, 0),
  };

  fs.writeFileSync(path.join(structuredDir, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`\nMaster index: ${index.totalPapers} papers, ${index.totalQuestions} questions`);
}

function main(): void {
  console.log('PYQ Data Fixer — Local JSON fixes (no API calls)');
  console.log('=================================================');

  const allResults: ReturnType<typeof processSubject>[] = [];

  for (const subjectKey of Object.keys(SUBJECT_MAP)) {
    const subjectDir = path.join(structuredDir, subjectKey);
    if (!fs.existsSync(subjectDir)) {
      console.log(`\nSkipping ${SUBJECT_MAP[subjectKey]} — no structured data`);
      continue;
    }
    allResults.push(processSubject(subjectKey));
  }

  buildMasterIndex(allResults);

  // Summary
  console.log('\n=== SUMMARY ===');
  let totalYearFixes = 0, totalAnswerFixes = 0, totalDupsRemoved = 0, totalQuestions = 0;
  for (const r of allResults) {
    totalYearFixes += r.yearsFix;
    totalAnswerFixes += r.answersFix;
    totalDupsRemoved += r.duplicatesRemoved;
    totalQuestions += r.totalQuestions;
    console.log(`  ${r.subject}: ${r.totalQuestions} questions (year fixes: ${r.yearsFix}, answer fixes: ${r.answersFix}, dupes removed: ${r.duplicatesRemoved})`);
  }
  console.log(`\n  Total: ${totalQuestions} questions`);
  console.log(`  Year fixes: ${totalYearFixes}`);
  console.log(`  Answer fixes: ${totalAnswerFixes}`);
  console.log(`  Duplicates removed: ${totalDupsRemoved}`);
}

main();
