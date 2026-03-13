import client, { MODEL_SMART } from '@/lib/openai';
import { getFlashcardPrompt } from '@/lib/prompts';
import { Subject, FlashcardData } from '@/types';

export async function generateFlashcards(
  topic: string,
  subject: Subject,
  customNotes?: string
): Promise<FlashcardData[]> {
  const prompt = customNotes
    ? `Generate flashcards from these notes on "${topic}":\n\n${customNotes}`
    : `Generate flashcards for the topic: "${topic}" for ${subject}.`;

  const response = await client.chat.completions.create({
    model: MODEL_SMART,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: getFlashcardPrompt(subject) },
      { role: 'user', content: prompt },
    ],
  });

  const text = response.choices[0]?.message?.content || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse flashcard response');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.cards.map((card: { front: string; back: string }, i: number) => ({
    id: `card_${Date.now()}_${i}`,
    front: card.front,
    back: card.back,
    status: 'new' as const,
    interval: 1,
  }));
}
