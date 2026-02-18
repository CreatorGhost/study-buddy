import Anthropic from '@anthropic-ai/sdk';
import client, { MODEL_FAST } from '@/lib/anthropic';
import { getOrchestratorPrompt } from '@/lib/prompts';
import { AgentType, Subject } from '@/types';

const delegateTool: Anthropic.Messages.Tool = {
  name: 'delegate_to_agent',
  description: 'Route the student request to a specialized agent',
  input_schema: {
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
};

export async function routeToAgent(
  userMessage: string,
  subject: Subject
): Promise<{ agent: AgentType; reason: string }> {
  const response = await client.messages.create({
    model: MODEL_FAST,
    max_tokens: 256,
    system: getOrchestratorPrompt(subject),
    tools: [delegateTool],
    tool_choice: { type: 'tool', name: 'delegate_to_agent' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolBlock = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
  );

  if (toolBlock) {
    const input = toolBlock.input as { agent: AgentType; reason: string };
    return { agent: input.agent, reason: input.reason };
  }

  // Default to tutor if routing fails
  return { agent: 'tutor', reason: 'Default routing' };
}
