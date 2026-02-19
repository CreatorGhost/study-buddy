import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx);
      const value = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

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

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
    process.exit(1);
  }

  return createClient(url, key);
}

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
  alternativeQuestion: Record<string, unknown> | null;
  year: number;
  paperId: string;
}

interface MarksFile {
  subject: string;
  marks: number;
  totalQuestions: number;
  questions: StructuredQuestion[];
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uploadSubject(supabase: any, subjectKey: string, dryRun: boolean): Promise<{ papers: number; questions: number }> {
  const subject = SUBJECT_MAP[subjectKey];
  const structuredDir = path.join(__dirname, '..', 'data', 'parsed', 'structured', subjectKey);

  if (!fs.existsSync(structuredDir)) {
    console.log(`  No structured data for ${subject}, skipping.`);
    return { papers: 0, questions: 0 };
  }

  // Read metadata
  const metadataPath = path.join(structuredDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.log(`  No metadata.json for ${subject}, skipping.`);
    return { papers: 0, questions: 0 };
  }

  const metadata: SubjectMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  // Upload papers
  // Default total_marks based on subject, duration to 180 min
  const defaultMarks = subject === 'Mathematics' ? 100 : 70;
  const paperRows = metadata.papers.map((p) => ({
    id: p.id,
    subject,
    year: p.year,
    set_code: p.setCode,
    total_marks: p.totalMarks || defaultMarks,
    duration: p.duration || 180,
    source_file: null,
  }));

  if (dryRun) {
    console.log(`  Would upsert ${paperRows.length} papers`);
  } else {
    const { error: paperError } = await supabase
      .from('pyq_papers')
      .upsert(paperRows, { onConflict: 'id' });

    if (paperError) {
      console.error(`  Failed to upsert papers for ${subject}:`, paperError.message);
      return { papers: 0, questions: 0 };
    }
    console.log(`  Upserted ${paperRows.length} papers`);
  }

  // Upload questions from each marks file
  let totalQuestions = 0;
  const markCategories = MARKS_BY_SUBJECT[subjectKey] || [1, 2, 3, 5];

  for (const marks of markCategories) {
    const marksFile = path.join(structuredDir, `${marks}-mark.json`);
    if (!fs.existsSync(marksFile)) continue;

    const data: MarksFile = JSON.parse(fs.readFileSync(marksFile, 'utf-8'));

    // Deduplicate by ID (some papers generate duplicate question IDs)
    const seen = new Set<string>();
    const questionRows = data.questions
      .filter((q) => {
        if (seen.has(q.id)) return false;
        seen.add(q.id);
        return true;
      })
      .map((q) => ({
        id: q.id,
        paper_id: q.paperId,
        subject,
        year: q.year,
        section: q.section,
        question_number: typeof q.questionNumber === 'string'
          ? parseInt(String(q.questionNumber).replace(/[^0-9]/g, '')) || 0
          : q.questionNumber,
        type: q.type,
        question: q.question,
        options: q.options,
        correct_answer: q.correctAnswer || 'See solution',
        solution: q.solution || 'No solution provided',
        marks: typeof q.marks === 'number' ? Math.round(q.marks) || marks : marks,
        topic: q.topic,
        has_alternative: q.hasAlternative || false,
        alternative_question: q.alternativeQuestion,
      }));

    if (dryRun) {
      console.log(`  Would upsert ${questionRows.length} questions (${marks}-mark)`);
    } else {
      // Batch upsert in chunks of 50
      for (let i = 0; i < questionRows.length; i += 50) {
        const chunk = questionRows.slice(i, i + 50);
        const { error } = await supabase
          .from('pyq_questions')
          .upsert(chunk, { onConflict: 'id' });

        if (error) {
          console.error(`  Failed to upsert ${marks}-mark questions (batch ${i}):`, error.message);
        }
      }
      console.log(`  Upserted ${questionRows.length} questions (${marks}-mark)`);
    }

    totalQuestions += questionRows.length;
  }

  return { papers: paperRows.length, questions: totalQuestions };
}

function printUsage(): void {
  console.log(`
Usage: npx tsx scripts/upload-to-supabase.ts [options]

Options:
  --subject <name>    Upload only one subject
  --dry-run           Show what would be uploaded without making changes
  --help              Show this help

Requires environment variables:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY

Examples:
  npx tsx scripts/upload-to-supabase.ts --dry-run
  npx tsx scripts/upload-to-supabase.ts --subject physics
  npx tsx scripts/upload-to-supabase.ts
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    printUsage();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const clean = args.includes('--clean');
  const subjectIdx = args.indexOf('--subject');
  const targetSubject = subjectIdx >= 0 ? args[subjectIdx + 1] : undefined;

  console.log('CBSE PYQ Uploader — Step 3: JSON to Supabase');
  console.log('=============================================\n');

  if (dryRun) {
    console.log('DRY RUN — No database changes will be made\n');
  }

  const supabase = dryRun ? null! : getSupabaseClient();
  const subjects = targetSubject ? [targetSubject] : Object.keys(SUBJECT_MAP);

  // Clean existing data if requested
  if (clean && !dryRun) {
    console.log('Cleaning existing data...');
    // Delete questions first (foreign key dependency)
    const { error: qErr } = await supabase.from('pyq_questions').delete().neq('id', '');
    if (qErr) console.error('  Failed to delete questions:', qErr.message);
    else console.log('  Deleted all existing questions');

    const { error: pErr } = await supabase.from('pyq_papers').delete().neq('id', '');
    if (pErr) console.error('  Failed to delete papers:', pErr.message);
    else console.log('  Deleted all existing papers');
    console.log('');
  }

  let totalPapers = 0;
  let totalQuestions = 0;

  for (const subjectKey of subjects) {
    console.log(`\n${SUBJECT_MAP[subjectKey]}:`);
    const result = await uploadSubject(supabase, subjectKey, dryRun);
    totalPapers += result.papers;
    totalQuestions += result.questions;
  }

  console.log(`\nDone! ${dryRun ? 'Would upload' : 'Uploaded'}: ${totalPapers} papers, ${totalQuestions} questions`);
}

main().catch(console.error);
