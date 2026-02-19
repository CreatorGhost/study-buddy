import { NextRequest, NextResponse } from 'next/server';
import client, { MODEL_SMART } from '@/lib/anthropic';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { buildGenerateSectionPrompt, SectionPromptData } from '@/lib/pyq-prompts';
import { parseJsonResponse, shuffle, requiresDiagram } from '@/lib/pyq-utils';
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
 * POST /api/pyq/generate-section — Generate questions for a single paper section.
 *
 * Called once per section (A-E) in parallel from the client.
 * Each call is small enough to never hit output token limits.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subject,
      section,
      count,
      marksPerQuestion,
      startQuestionNumber,
    } = body as {
      subject: Subject;
      section: string;
      count: number;
      marksPerQuestion: number;
      startQuestionNumber: number;
    };

    if (!subject || !VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: 'Invalid or missing subject' }, { status: 400 });
    }
    if (!section || !count || !marksPerQuestion || !startQuestionNumber) {
      return NextResponse.json({ error: 'Missing section parameters' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }
    const supabase = getSupabase();

    // Targeted query: only questions matching this section's marks value
    const { data, error } = await supabase
      .from('pyq_questions')
      .select('id, question, options, correct_answer, section, marks, type, topic')
      .eq('subject', subject)
      .eq('marks', marksPerQuestion)
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const usable = (data as DBQuestion[]).filter((q) => !requiresDiagram(q.question));

    // Prefer questions from the matching section letter, fall back to all marks-matched
    let pool = usable.filter((q) => (q.section || '').toUpperCase() === section);
    if (pool.length < 3) {
      pool = usable.length > pool.length ? usable : pool;
    }

    const shuffled = shuffle(pool);

    // 50/50 split: ceil(N/2) to reword, floor(N/2) fresh
    const rewordCount = Math.ceil(count / 2);

    const rewordQuestions = shuffled.slice(0, Math.min(rewordCount, shuffled.length)).map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_answer,
      type: q.type,
      topic: q.topic || undefined,
    }));

    const patternQuestions = shuffled.slice(rewordQuestions.length, rewordQuestions.length + 10).map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_answer,
      type: q.type,
      topic: q.topic || undefined,
    }));

    const actualFreshCount = count - rewordQuestions.length;

    const sectionData: SectionPromptData = {
      section,
      count,
      marksPerQuestion,
      rewordQuestions,
      patternQuestions,
      freshCount: actualFreshCount,
    };

    const prompt = buildGenerateSectionPrompt(subject, sectionData, startQuestionNumber);

    const response = await client.messages.create({
      model: MODEL_SMART,
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = parseJsonResponse(text);

    if (!parsed?.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: `Failed to parse Section ${section} response` },
        { status: 500 },
      );
    }

    const questions: PYQQuestion[] = (parsed.questions as Record<string, unknown>[]).map(
      (q, index) => ({
        id: `gen_${Date.now()}_${section}_${index}`,
        questionNumber: (q.questionNumber as number) || startQuestionNumber + index,
        section: (q.section as string) || section,
        type: toValidType(q.type),
        question: (q.question as string) || '',
        options: (q.options as string[] | null) || undefined,
        correctAnswer: (q.correctAnswer as string) || '',
        solution: (q.solution as string) || '',
        marks: (q.marks as number) || marksPerQuestion,
        topic: (q.topic as string) || undefined,
      }),
    );

    return NextResponse.json({ questions, section });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Section generation failed';
    console.error('Generate section error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
