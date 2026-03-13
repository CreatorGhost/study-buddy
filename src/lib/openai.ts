import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60_000,
  maxRetries: 1,
});

export default client;

export const MODEL_FAST = 'gpt-5-mini';
export const MODEL_SMART = 'gpt-5.3-chat-latest';
