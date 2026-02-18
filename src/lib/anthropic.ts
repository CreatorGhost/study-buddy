import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default client;

export const MODEL_FAST = 'claude-haiku-4-5-20251001';
export const MODEL_SMART = 'claude-sonnet-4-6';
