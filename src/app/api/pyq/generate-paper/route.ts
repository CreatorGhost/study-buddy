import { NextRequest, NextResponse } from 'next/server';
import client, { MODEL_SMART } from '@/lib/anthropic';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { buildGeneratePaperPrompt, SectionPromptData } from '@/lib/pyq-prompts';
import { parseJsonResponse, CBSE_PAPER_STRUCTURE, shuffle, requiresDiagram } from '@/lib/pyq-utils';
import { Subject, PYQQuestion } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science'];

const VALID_PYQ_TYPES: PYQQuestion['type'][] = [
  'mcq', 'assertion-reasoning', 'short-answer', 'long-answer',
  'case-based', 'fill-blank', 'true-false', 'coding',
];

function toValidType(raw: unknown): PYQQuestion['type'] {
  if (typeof raw === 'string' && VALID_PYQ_TYPES.includes(raw as PYQQuestion['type'])) {
    return raw as PYQQuestion['type'];
  }
  return 'short-answer';
}

interface DBQuestion {
  id: string;
  question: string;
  options: string[] | null;
  correct_answer: string;
  section: string;
  marks: number;
  type: string;
  topic: string | null;
}

/**
 * POST /api/pyq/generate-paper — AI sample paper generation
 * 50% reworded PYQs + 50% fresh questions per section
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject } = body as { subject: Subject };

    if (!subject || !VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: 'Invalid or missing subject' }, { status: 400 });
    }

    const structure = CBSE_PAPER_STRUCTURE[subject];
    if (!structure) {
      return NextResponse.json({ error: 'Unknown subject structure' }, { status: 400 });
    }

    // Fetch all questions for this subject from Supabase
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }
    const supabase = getSupabase();

    const allQuestions: DBQuestion[] = [];
    const PAGE_SIZE = 500;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('pyq_questions')
        .select('id, question, options, correct_answer, section, marks, type, topic')
        .eq('subject', subject)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data) allQuestions.push(...data);
      hasMore = (data?.length ?? 0) === PAGE_SIZE;
      page++;
    }

    // Filter out diagram-dependent questions
    const usable = allQuestions.filter((q) => !requiresDiagram(q.question));

    // Build section data for the prompt
    const sectionPromptData: SectionPromptData[] = structure.sections.map((secDef) => {
      // Primary match: section letter + marks
      let pool = usable.filter(
        (q) => (q.section || '').toUpperCase() === secDef.section && q.marks === secDef.marksPerQuestion,
      );

      // Fallback: if too few, broaden to just marks-matching from any section
      if (pool.length < 3) {
        const marksPool = usable.filter((q) => q.marks === secDef.marksPerQuestion);
        if (marksPool.length > pool.length) {
          pool = marksPool;
        }
      }

      const shuffled = shuffle(pool);

      // 50/50 split: ceil(N/2) to reword, floor(N/2) fresh
      const rewordCount = Math.ceil(secDef.count / 2);
      const freshCount = secDef.count - rewordCount;

      // Pick reword candidates (up to rewordCount)
      const rewordQuestions = shuffled.slice(0, Math.min(rewordCount, shuffled.length)).map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        type: q.type,
        topic: q.topic || undefined,
      }));

      // Pick pattern examples from the rest (up to 10 for context)
      const patternQuestions = shuffled.slice(rewordQuestions.length, rewordQuestions.length + 10).map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        type: q.type,
        topic: q.topic || undefined,
      }));

      // If we have fewer reword candidates than desired, increase fresh count
      const actualFreshCount = secDef.count - rewordQuestions.length;

      return {
        section: secDef.section,
        count: secDef.count,
        marksPerQuestion: secDef.marksPerQuestion,
        rewordQuestions,
        patternQuestions,
        freshCount: actualFreshCount,
      };
    });

    // Build and send prompt
    const prompt = buildGeneratePaperPrompt(
      subject,
      structure.totalQuestions,
      structure.totalMarks,
      sectionPromptData,
    );

    const response = await client.messages.create({
      model: MODEL_SMART,
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = parseJsonResponse(text);

    if (!parsed?.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: 'Failed to parse generated paper' },
        { status: 500 },
      );
    }

    // Map to PYQQuestion format
    const questions: PYQQuestion[] = (parsed.questions as Record<string, unknown>[]).map(
      (q, index) => ({
        id: `gen_${Date.now()}_${index}`,
        questionNumber: (q.questionNumber as number) || index + 1,
        section: (q.section as string) || 'A',
        type: toValidType(q.type),
        question: (q.question as string) || '',
        options: (q.options as string[] | null) || undefined,
        correctAnswer: (q.correctAnswer as string) || '',
        solution: (q.solution as string) || '',
        marks: (q.marks as number) || 1,
        topic: (q.topic as string) || undefined,
      }),
    );

    return NextResponse.json({
      questions,
      structure: {
        totalQuestions: structure.totalQuestions,
        totalMarks: structure.totalMarks,
        durationMinutes: structure.durationMinutes,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Paper generation failed';
    console.error('Generate paper error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
