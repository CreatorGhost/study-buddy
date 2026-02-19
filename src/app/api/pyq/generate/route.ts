import { NextRequest, NextResponse } from 'next/server';
import client, { MODEL_SMART } from '@/lib/anthropic';
import { buildGeneratePrompt } from '@/lib/pyq-prompts';
import { parseJsonResponse } from '@/lib/pyq-utils';
import { Subject, PYQQuestion } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

interface GenerateRequest {
  subject: Subject;
  marks: number;
  count: number;
  topic?: string;
  type?: string;
  sampleQuestions?: Array<{
    question: string;
    correctAnswer: string;
    type: string;
  }>;
}

/**
 * POST /api/pyq/generate — AI similar question generation
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const { subject, marks, count, topic, type, sampleQuestions } = body;

    const VALID_SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science'];

    if (!subject || marks == null || !count) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, marks, count' },
        { status: 400 }
      );
    }

    if (!VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject' },
        { status: 400 }
      );
    }

    const prompt = buildGeneratePrompt(
      subject,
      marks,
      count,
      topic,
      type,
      sampleQuestions
    );

    const response = await client.messages.create({
      model: MODEL_SMART,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const parsed = parseJsonResponse(text);

    if (!parsed?.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: 'Failed to parse generated questions' },
        { status: 500 }
      );
    }

    const questions: PYQQuestion[] = parsed.questions.map(
      (q: Record<string, unknown>, index: number) => ({
        id: `ai_${Date.now()}_${index}`,
        questionNumber: (q.questionNumber as number) || index + 1,
        section: (q.section as string) || 'AI Generated',
        type: toValidType(q.type),
        question: (q.question as string) || '',
        options: (q.options as string[] | null) || undefined,
        correctAnswer: (q.correctAnswer as string) || '',
        solution: (q.solution as string) || '',
        marks: (q.marks as number) || marks,
        topic: (q.topic as string) || topic || undefined,
      })
    );

    return NextResponse.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
