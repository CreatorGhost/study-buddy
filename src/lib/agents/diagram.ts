import client, { MODEL_SMART } from '@/lib/openai';
import { getDiagramPrompt } from '@/lib/prompts';
import { Subject, Message } from '@/types';

export async function* streamDiagramResponse(
  messages: Message[],
  subject: Subject
): AsyncGenerator<string> {
  const apiMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const stream = await client.chat.completions.create({
    model: MODEL_SMART,
    max_completion_tokens: 4096,
    messages: [
      { role: 'system', content: getDiagramPrompt(subject) },
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
