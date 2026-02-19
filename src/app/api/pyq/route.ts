import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/pyq — query PYQ data
//
// Query params:
//   (none)                    → index: subjects, years, question counts
//   subject=Physics           → all questions for that subject
//   subject=Physics&marks=1   → all 1-mark Physics questions
//   subject=Physics&year=2024 → all questions from that paper
//   subject=Physics&marks=1&year=2024 → filtered by both
//   limit=20&offset=0        → pagination
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const { searchParams } = req.nextUrl;

  const subject = searchParams.get('subject');
  const marks = searchParams.get('marks');
  const year = searchParams.get('year');
  const topic = searchParams.get('topic');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  // No subject = return index/overview
  if (!subject) {
    return getIndex(supabase);
  }

  // Build query
  let query = supabase
    .from('pyq_questions')
    .select('*', { count: 'exact' })
    .eq('subject', subject);

  if (marks) query = query.eq('marks', parseInt(marks));
  if (year) query = query.eq('year', parseInt(year));
  if (topic) query = query.ilike('topic', `%${topic}%`);
  if (type) query = query.eq('type', type);

  query = query
    .order('year', { ascending: false })
    .order('question_number', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    questions: data,
    total: count,
    limit,
    offset,
  });
}

async function getIndex(supabase: ReturnType<typeof getSupabase>) {
  // Get papers overview
  const { data: papers, error: papersError } = await supabase
    .from('pyq_papers')
    .select('*')
    .order('year', { ascending: false });

  if (papersError) {
    return NextResponse.json({ error: papersError.message }, { status: 500 });
  }

  // Get question counts grouped by subject and marks
  // Supabase default SELECT returns max 1000 rows — must paginate since we have 1,579+ questions
  const allCounts: { subject: string; marks: number }[] = [];
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: countsError } = await supabase
      .from('pyq_questions')
      .select('subject, marks')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (countsError) {
      return NextResponse.json({ error: countsError.message }, { status: 500 });
    }

    if (batch) allCounts.push(...batch);
    hasMore = (batch?.length ?? 0) === PAGE_SIZE;
    page++;
  }

  const counts = allCounts;

  // Aggregate counts
  const subjectStats: Record<string, {
    years: Set<number>;
    markCounts: Record<number, number>;
    totalQuestions: number;
  }> = {};

  for (const row of counts || []) {
    if (!subjectStats[row.subject]) {
      subjectStats[row.subject] = {
        years: new Set(),
        markCounts: {},
        totalQuestions: 0,
      };
    }
    const stat = subjectStats[row.subject];
    stat.markCounts[row.marks] = (stat.markCounts[row.marks] || 0) + 1;
    stat.totalQuestions++;
  }

  // Add years from papers
  for (const paper of papers || []) {
    if (subjectStats[paper.subject]) {
      subjectStats[paper.subject].years.add(paper.year);
    }
  }

  // Convert to serializable format
  const subjects = Object.entries(subjectStats).map(([name, stat]) => ({
    name,
    years: Array.from(stat.years).sort((a, b) => b - a),
    markCounts: stat.markCounts,
    totalQuestions: stat.totalQuestions,
  }));

  return NextResponse.json({
    subjects,
    papers,
    totalPapers: papers?.length || 0,
    totalQuestions: counts?.length || 0,
  });
}

// POST /api/pyq — save practice result
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const body = await req.json();

  const {
    subject,
    marksCategory,
    year,
    questionsAttempted,
    questionsCorrect,
    scorePercentage,
    weakTopics,
    answers,
  } = body;

  if (!subject || !marksCategory || questionsAttempted === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: subject, marksCategory, questionsAttempted' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('pyq_results')
    .insert({
      subject,
      marks_category: marksCategory,
      year: year || null,
      questions_attempted: questionsAttempted,
      questions_correct: questionsCorrect,
      score_percentage: scorePercentage,
      weak_topics: weakTopics || null,
      answers: answers || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ result: data });
}
