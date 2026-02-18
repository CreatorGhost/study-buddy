import client, { MODEL_SMART } from '@/lib/anthropic';
import { getQuizPrompt } from '@/lib/prompts';
import { Subject, QuizQuestion, QuizConfig } from '@/types';

export async function generateQuiz(config: QuizConfig): Promise<QuizQuestion[]> {
  const prompt = `Generate ${config.numQuestions} ${config.difficulty} difficulty ${config.questionType === 'mixed' ? 'mixed (MCQ and assertion-reasoning)' : config.questionType} questions on the topic: "${config.topic}" for CBSE Class 12 ${config.subject}.`;

  const response = await client.messages.create({
    model: MODEL_SMART,
    max_tokens: 4096,
    system: getQuizPrompt(config.subject),
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => ('text' in block ? block.text : ''))
    .join('');

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse quiz response');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.questions.map((q: QuizQuestion, i: number) => ({
    ...q,
    id: q.id || `q${i + 1}`,
  }));
}

export async function evaluateAnswer(
  question: string,
  studentAnswer: string,
  correctAnswer: string,
  subject: Subject
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL_SMART,
    max_tokens: 512,
    system: `You are a CBSE Class 12 ${subject} evaluator. Provide brief, constructive feedback on the student's answer.`,
    messages: [{
      role: 'user',
      content: `Question: ${question}\nStudent's answer: ${studentAnswer}\nCorrect answer: ${correctAnswer}\n\nProvide feedback in 2-3 sentences.`,
    }],
  });

  return response.content
    .filter(block => block.type === 'text')
    .map(block => ('text' in block ? block.text : ''))
    .join('');
}
