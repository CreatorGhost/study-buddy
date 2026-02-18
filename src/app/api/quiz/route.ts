import { NextRequest, NextResponse } from 'next/server';
import { generateQuiz } from '@/lib/agents/quiz';
import { generateFlashcards } from '@/lib/agents/flashcard';
import { QuizConfig, Subject } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  try {
    if (action === 'generate_quiz') {
      const config: QuizConfig = body.config;
      const questions = await generateQuiz(config);
      return NextResponse.json({ questions });
    }

    if (action === 'generate_flashcards') {
      const { topic, subject, notes }: { topic: string; subject: Subject; notes?: string } = body;
      const cards = await generateFlashcards(topic, subject, notes);
      return NextResponse.json({ cards });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
