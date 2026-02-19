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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase: any = createClient(url, key);

  console.log('PYQ Data Verification');
  console.log('=====================\n');

  // 1. Check papers
  const { data: papers, error: pErr } = await supabase.from('pyq_papers').select('*');
  if (pErr) { console.error('Papers error:', pErr.message); return; }
  console.log(`Papers in Supabase: ${papers.length}`);

  // 2. Check questions (paginate to avoid 1000 row limit)
  const questions: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error: qErr } = await supabase
      .from('pyq_questions')
      .select('id, subject, year, marks, question_number, correct_answer, solution, paper_id')
      .range(offset, offset + pageSize - 1);
    if (qErr) { console.error('Questions error:', qErr.message); return; }
    questions.push(...(data || []));
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }
  console.log(`Questions in Supabase: ${questions.length}`);

  // 3. Check by subject
  console.log('\n--- By Subject ---');
  const bySubject: Record<string, number> = {};
  const bySubjectMarks: Record<string, Record<number, number>> = {};
  const bySubjectYears: Record<string, Set<number>> = {};

  for (const q of questions) {
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
    if (!bySubjectMarks[q.subject]) bySubjectMarks[q.subject] = {};
    bySubjectMarks[q.subject][q.marks] = (bySubjectMarks[q.subject][q.marks] || 0) + 1;
    if (!bySubjectYears[q.subject]) bySubjectYears[q.subject] = new Set();
    bySubjectYears[q.subject].add(q.year);
  }

  // Compare with JSON metadata
  const structuredDir = path.join(__dirname, '..', 'data', 'parsed', 'structured');
  const indexData = JSON.parse(fs.readFileSync(path.join(structuredDir, 'index.json'), 'utf-8'));

  let allMatch = true;
  for (const subjectKey of Object.keys(SUBJECT_MAP)) {
    const subject = SUBJECT_MAP[subjectKey];
    const dbCount = bySubject[subject] || 0;
    const jsonEntry = indexData.subjects.find((s: any) => s.name === subject);
    const jsonCount = jsonEntry?.totalQuestions || 0;
    const match = dbCount === jsonCount ? 'MATCH' : 'MISMATCH';
    if (match === 'MISMATCH') allMatch = false;

    const years = bySubjectYears[subject] ? Array.from(bySubjectYears[subject]).sort((a, b) => b - a) : [];
    console.log(`  ${subject}: DB=${dbCount}, JSON=${jsonCount} → ${match}`);
    console.log(`    Years: ${years.join(', ')}`);
    console.log(`    Marks: ${JSON.stringify(bySubjectMarks[subject] || {})}`);
  }

  // 4. Check for duplicate IDs
  console.log('\n--- Duplicate Check ---');
  const idCounts: Record<string, number> = {};
  for (const q of questions) {
    idCounts[q.id] = (idCounts[q.id] || 0) + 1;
  }
  const dupes = Object.entries(idCounts).filter(([, count]) => count > 1);
  console.log(`  Duplicate IDs: ${dupes.length}`);
  if (dupes.length > 0) {
    allMatch = false;
    for (const [id, count] of dupes.slice(0, 10)) {
      console.log(`    ${id}: ${count} copies`);
    }
  }

  // 5. Check for null/empty critical fields
  console.log('\n--- Null/Empty Fields ---');
  let nullCorrectAnswer = 0;
  let nullSolution = 0;
  let nullQuestion = 0;
  let zeroQuestionNumber = 0;

  for (const q of questions) {
    if (!q.correct_answer) nullCorrectAnswer++;
    if (!q.solution) nullSolution++;
    if (!q.question_number && q.question_number !== 0) nullQuestion++;
    if (q.question_number === 0) zeroQuestionNumber++;
  }

  console.log(`  Null correct_answer: ${nullCorrectAnswer}`);
  console.log(`  Null solution: ${nullSolution}`);
  console.log(`  Null question_number: ${nullQuestion}`);
  console.log(`  Zero question_number (from sub-parts): ${zeroQuestionNumber}`);

  // 6. Check paper references
  console.log('\n--- Paper Reference Check ---');
  const paperIds = new Set(papers.map((p: any) => p.id));
  let orphanQuestions = 0;
  for (const q of questions) {
    if (!paperIds.has(q.paper_id)) {
      orphanQuestions++;
    }
  }
  console.log(`  Orphan questions (no matching paper): ${orphanQuestions}`);
  if (orphanQuestions > 0) allMatch = false;

  // 7. Papers by subject
  console.log('\n--- Papers by Subject ---');
  const papersBySubject: Record<string, number> = {};
  for (const p of papers) {
    papersBySubject[p.subject] = (papersBySubject[p.subject] || 0) + 1;
  }
  for (const [subject, count] of Object.entries(papersBySubject)) {
    console.log(`  ${subject}: ${count} papers`);
  }

  // 8. Check year uniqueness per subject (no more duplicate 2024s)
  console.log('\n--- Year Uniqueness ---');
  for (const p of papers) {
    const sameSubjectYear = papers.filter((pp: any) => pp.subject === p.subject && pp.year === p.year);
    if (sameSubjectYear.length > 1) {
      console.log(`  WARNING: ${p.subject} has ${sameSubjectYear.length} papers for year ${p.year}`);
      allMatch = false;
    }
  }

  // Final verdict
  console.log('\n========================================');
  if (allMatch && questions.length === indexData.totalQuestions && papers.length === indexData.totalPapers) {
    console.log(`PASS: All ${questions.length} questions and ${papers.length} papers verified.`);
    console.log('No duplicates, no orphans, no null critical fields.');
  } else {
    console.log('ISSUES FOUND — see details above');
  }
}

main().catch(console.error);
