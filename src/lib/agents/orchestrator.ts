import client, { MODEL_FAST } from '@/lib/openai';
import { getOrchestratorPrompt } from '@/lib/prompts';
import { AgentType, Subject } from '@/types';

const delegateTool = {
  type: 'function' as const,
  function: {
    name: 'delegate_to_agent',
    description: 'Route the student request to a specialized agent',
    parameters: {
      type: 'object' as const,
      properties: {
        agent: {
          type: 'string',
          enum: ['tutor', 'quiz', 'diagram', 'flashcard'],
          description: 'The agent to delegate to',
        },
        reason: {
          type: 'string',
          description: 'Brief reason for this routing decision',
        },
      },
      required: ['agent', 'reason'],
    },
  },
};

export async function routeToAgent(
  userMessage: string,
  subject: Subject
): Promise<{ agent: AgentType; reason: string }> {
  const response = await client.chat.completions.create({
    model: MODEL_FAST,
    max_tokens: 256,
    messages: [
      { role: 'system', content: getOrchestratorPrompt(subject) },
      { role: 'user', content: userMessage },
    ],
    tools: [delegateTool],
    tool_choice: { type: 'function', function: { name: 'delegate_to_agent' } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];

  const VALID_AGENTS: AgentType[] = ['tutor', 'quiz', 'diagram', 'flashcard'];

  if (toolCall && toolCall.type === 'function') {
    try {
      const input = JSON.parse(toolCall.function.arguments) as { agent: string; reason: string };
      if (VALID_AGENTS.includes(input.agent as AgentType) && typeof input.reason === 'string') {
        return { agent: input.agent as AgentType, reason: input.reason };
      }
    } catch {
      // Fall through to default
    }
  }

  // Default to tutor if routing fails or payload is invalid
  return { agent: 'tutor', reason: 'Default routing' };
}
