import client, { MODEL_SMART } from '@/lib/openai';
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

  const stream = await client.chat.completions.create({
    model: MODEL_SMART,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: getTutorPrompt(subject) },
      ...apiMessages,
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      yield text;
    }
  }
}
