import { NextRequest, NextResponse } from 'next/server';
import client, { MODEL_FAST } from '@/lib/anthropic';
import {
  buildCheckPrompt,
  buildCodeCheckPrompt,
  buildImageCheckPrompt,
} from '@/lib/pyq-prompts';
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

    // Split questions into categories
    const imageQuestions = questions.filter((q) => q.imageBase64);
    const codeQuestions = questions.filter(
      (q) => !q.imageBase64 && q.type === 'coding'
    );
    const textQuestions = questions.filter(
      (q) => !q.imageBase64 && q.type !== 'coding'
    );

    const allResults: CheckResult[] = [];

    // Process all categories in parallel
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
            if (parsed?.results) {
              allResults.push(...parsed.results);
            }
          } catch (err) {
            console.error('Text check failed:', err);
            // Return fallback results for text questions
            for (const q of textQuestions) {
              allResults.push({
                questionId: q.id,
                score: 0,
                maxMarks: q.marks,
                feedback: 'Evaluation failed. Please try again.',
                keyPointsMissed: [],
                isCorrect: false,
              });
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
            if (parsed?.results) {
              allResults.push(...parsed.results);
            }
          } catch (err) {
            console.error('Code check failed:', err);
            for (const q of codeQuestions) {
              allResults.push({
                questionId: q.id,
                score: 0,
                maxMarks: q.marks,
                feedback: 'Code evaluation failed. Please try again.',
                keyPointsMissed: [],
                isCorrect: false,
              });
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

            // Extract media type and strip data URL prefix
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
                    {
                      type: 'text',
                      text: prompt,
                    },
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
              allResults.push({
                questionId: q.id,
                score: parsed.score ?? 0,
                maxMarks: parsed.maxMarks ?? q.marks,
                feedback: parsed.feedback ?? 'No feedback available.',
                keyPointsMissed: parsed.keyPointsMissed ?? [],
                isCorrect: parsed.isCorrect ?? false,
              });
            }
          } catch (err) {
            console.error(`Image check failed for question ${q.id}:`, err);
            allResults.push({
              questionId: q.id,
              score: 0,
              maxMarks: q.marks,
              feedback:
                'Image evaluation failed. Please try again or type your answer instead.',
              keyPointsMissed: [],
              isCorrect: false,
            });
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

/**
 * Parse a JSON response from Claude, handling markdown code fences.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonResponse(text: string): any {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code fence
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
