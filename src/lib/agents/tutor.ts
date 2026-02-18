import client, { MODEL_SMART } from '@/lib/anthropic';
import { getTutorPrompt } from '@/lib/prompts';
import { Subject, Message } from '@/types';

export async function* streamTutorResponse(
  messages: Message[],
  subject: Subject
): AsyncGenerator<string> {
  const apiMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const stream = client.messages.stream({
    model: MODEL_SMART,
    max_tokens: 4096,
    system: getTutorPrompt(subject),
    messages: apiMessages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
