import { NextRequest, NextResponse } from 'next/server';
import client, { MODEL_FAST } from '@/lib/anthropic';
import {
  buildCheckPrompt,
  buildCodeCheckPrompt,
  buildImageCheckPrompt,
} from '@/lib/pyq-prompts';
import { parseJsonResponse } from '@/lib/pyq-utils';
import { Subject } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QuestionInput {
  id: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  solution: string;
  type: string;
  marks: number;
  imageBase64?: string;
  codeLanguage?: string;
}

interface CheckResult {
  questionId: string;
  score: number;
  maxMarks: number;
  feedback: string;
  keyPointsMissed: string[];
  isCorrect: boolean;
}

function makeFallback(questionId: string, maxMarks: number, feedback: string): CheckResult {
  return { questionId, score: 0, maxMarks, feedback, keyPointsMissed: [], isCorrect: false };
}

function clampResult(r: CheckResult, maxMarks: number): CheckResult {
  const score = Math.max(0, Math.min(Number(r.score) || 0, maxMarks));
  return { ...r, score, maxMarks, isCorrect: score >= maxMarks };
}

/**
 * POST /api/pyq/check — batch AI answer evaluation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, questions } = body as {
      subject: Subject;
      questions: QuestionInput[];
    };

    const VALID_SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science'];

    if (!subject || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, questions' },
        { status: 400 }
      );
    }

    if (!VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject' },
        { status: 400 }
      );
    }

    const imageQuestions = questions.filter((q) => q.imageBase64);
    const codeQuestions = questions.filter(
      (q) => !q.imageBase64 && q.type === 'coding'
    );
    const textQuestions = questions.filter(
      (q) => !q.imageBase64 && q.type !== 'coding'
    );

    const allResults: CheckResult[] = [];
    const marksById = new Map(questions.map(q => [q.id, q.marks]));
    const promises: Promise<void>[] = [];

    // 1. Text-based questions (batch)
    if (textQuestions.length > 0) {
      promises.push(
        (async () => {
          try {
            const prompt = buildCheckPrompt(subject, textQuestions);
            const response = await client.messages.create({
              model: MODEL_FAST,
              max_tokens: 4096,
              messages: [{ role: 'user', content: prompt }],
            });

            const text =
              response.content[0].type === 'text'
                ? response.content[0].text
                : '';
            const parsed = parseJsonResponse(text);
            if (Array.isArray(parsed?.results)) {
              for (const r of parsed.results) {
                allResults.push(clampResult(r, marksById.get(r.questionId) ?? r.maxMarks));
              }
            } else if (parsed?.results != null) {
              const r = parsed.results as CheckResult;
              allResults.push(clampResult(r, marksById.get(r.questionId) ?? r.maxMarks));
            } else {
              console.error('Text check parse failed');
              for (const q of textQuestions) {
                allResults.push(makeFallback(q.id, q.marks, 'Could not parse evaluation response. Please try again.'));
              }
            }
          } catch (err) {
            console.error('Text check failed:', err);
            for (const q of textQuestions) {
              allResults.push(makeFallback(q.id, q.marks, 'Evaluation failed. Please try again.'));
            }
          }
        })()
      );
    }

    // 2. Code questions (batch)
    if (codeQuestions.length > 0) {
      promises.push(
        (async () => {
          try {
            const prompt = buildCodeCheckPrompt(
              subject,
              codeQuestions.map((q) => ({
                id: q.id,
                question: q.question,
                studentCode: q.studentAnswer,
                correctAnswer: q.correctAnswer,
                solution: q.solution,
                marks: q.marks,
                language: q.codeLanguage || 'python',
              }))
            );
            const response = await client.messages.create({
              model: MODEL_FAST,
              max_tokens: 4096,
              messages: [{ role: 'user', content: prompt }],
            });

            const text =
              response.content[0].type === 'text'
                ? response.content[0].text
                : '';
            const parsed = parseJsonResponse(text);
            if (Array.isArray(parsed?.results)) {
              for (const r of parsed.results) {
                allResults.push(clampResult(r, marksById.get(r.questionId) ?? r.maxMarks));
              }
            } else if (parsed?.results != null) {
              const r = parsed.results as CheckResult;
              allResults.push(clampResult(r, marksById.get(r.questionId) ?? r.maxMarks));
            } else {
              console.error('Code check parse failed');
              for (const q of codeQuestions) {
                allResults.push(makeFallback(q.id, q.marks, 'Could not parse evaluation response. Please try again.'));
              }
            }
          } catch (err) {
            console.error('Code check failed:', err);
            for (const q of codeQuestions) {
              allResults.push(makeFallback(q.id, q.marks, 'Code evaluation failed. Please try again.'));
            }
          }
        })()
      );
    }

    // 3. Image questions (one call each — vision requires individual messages)
    for (const q of imageQuestions) {
      promises.push(
        (async () => {
          try {
            const prompt = buildImageCheckPrompt(
              subject,
              q.question,
              q.correctAnswer,
              q.solution,
              q.marks
            );

            const dataUrl = q.imageBase64!;
            const mediaTypeMatch = dataUrl.match(/^data:(image\/\w+);base64,/);
            const mediaType = (mediaTypeMatch?.[1] || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
            const base64Data = dataUrl.replace(
              /^data:image\/\w+;base64,/,
              ''
            );

            const response = await client.messages.create({
              model: MODEL_FAST,
              max_tokens: 4096,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: mediaType,
                        data: base64Data,
                      },
                    },
                    { type: 'text', text: prompt },
                  ],
                },
              ],
            });

            const text =
              response.content[0].type === 'text'
                ? response.content[0].text
                : '';
            const parsed = parseJsonResponse(text);
            if (parsed) {
              const raw: CheckResult = {
                questionId: q.id,
                score: (parsed.score as number) ?? 0,
                maxMarks: (parsed.maxMarks as number) ?? q.marks,
                feedback: (parsed.feedback as string) ?? 'No feedback available.',
                keyPointsMissed: (parsed.keyPointsMissed as string[]) ?? [],
                isCorrect: (parsed.isCorrect as boolean) ?? false,
              };
              allResults.push(clampResult(raw, q.marks));
            } else {
              console.error(`Image check parse failed for question ${q.id}`);
              allResults.push(makeFallback(q.id, q.marks, 'Could not parse evaluation response. Please try again.'));
            }
          } catch (err) {
            console.error(`Image check failed for question ${q.id}:`, err);
            allResults.push(makeFallback(q.id, q.marks, 'Image evaluation failed. Please try again or type your answer instead.'));
          }
        })()
      );
    }

    await Promise.all(promises);

    return NextResponse.json({ results: allResults });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
