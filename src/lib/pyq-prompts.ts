import { Subject } from '@/types';

/**
 * Build the prompt for batch AI answer evaluation
 */
export function buildCheckPrompt(
  subject: Subject,
  questions: Array<{
    id: string;
    question: string;
    studentAnswer: string;
    correctAnswer: string;
    solution: string;
    type: string;
    marks: number;
    imageBase64?: string;
  }>,
): string {
  const questionsText = questions
    .map(
      (q, i) => `
--- Question ${i + 1} (ID: ${q.id}, ${q.marks} marks, type: ${q.type}) ---
Question: ${q.question}

Expected Answer: ${q.correctAnswer}

Reference Solution: ${q.solution}

Student's Answer: ${q.imageBase64 ? '[See attached image]' : q.studentAnswer}
`,
    )
    .join('\n');

  return `You are an expert CBSE ${subject} examiner. Evaluate the following student answers strictly according to CBSE marking scheme guidelines.

For each question, provide:
1. A score out of the maximum marks (award partial marks where appropriate)
2. Brief feedback explaining what was correct/incorrect
3. Key points missed (if any)

Be fair but strict — award marks only for correct, relevant content. For numerical problems, the final answer and key steps must be correct.

${questionsText}

Respond in this exact JSON format:
{
  "results": [
    {
      "questionId": "<id>",
      "score": <number>,
      "maxMarks": <number>,
      "feedback": "<markdown feedback>",
      "keyPointsMissed": ["<point1>", "<point2>"],
      "isCorrect": <boolean>
    }
  ]
}`;
}

/**
 * Build the prompt for checking code answers
 */
export function buildCodeCheckPrompt(
  subject: Subject,
  questions: Array<{
    id: string;
    question: string;
    studentCode: string;
    correctAnswer: string;
    solution: string;
    marks: number;
    language: string;
  }>,
): string {
  const questionsText = questions
    .map(
      (q, i) => `
--- Question ${i + 1} (ID: ${q.id}, ${q.marks} marks, language: ${q.language}) ---
Question: ${q.question}

Expected Answer/Output: ${q.correctAnswer}

Reference Solution: ${q.solution}

Student's Code:
\`\`\`${q.language}
${q.studentCode}
\`\`\`
`,
    )
    .join('\n');

  return `You are an expert CBSE ${subject} examiner evaluating programming answers.

For each question, evaluate:
1. Syntax correctness
2. Logic correctness
3. Expected output match
4. Code quality and style (minor deductions only)

Award partial marks for partially correct logic. CBSE is lenient on minor syntax errors if logic is sound.

${questionsText}

Respond in this exact JSON format:
{
  "results": [
    {
      "questionId": "<id>",
      "score": <number>,
      "maxMarks": <number>,
      "feedback": "<markdown feedback with code suggestions>",
      "keyPointsMissed": ["<point1>", "<point2>"],
      "isCorrect": <boolean>
    }
  ]
}`;
}

/**
 * Build prompt for generating AI similar questions
 */
export function buildGeneratePrompt(
  subject: Subject,
  marks: number,
  count: number,
  topic?: string,
  type?: string,
  sampleQuestions?: Array<{ question: string; correctAnswer: string; type: string }>,
): string {
  const samplesText = sampleQuestions
    ?.map((q, i) => `Sample ${i + 1} (${q.type}): ${q.question}\nAnswer: ${q.correctAnswer}`)
    .join('\n\n') || 'No samples provided';

  return `You are a CBSE ${subject} question paper setter. Generate ${count} original questions that are similar in style, difficulty, and format to real CBSE board exam questions.

Requirements:
- Subject: ${subject}
- Marks per question: ${marks}
${topic ? `- Topic: ${topic}` : ''}
${type ? `- Question type: ${type}` : ''}
- Questions should be original but follow CBSE patterns
- Include proper options for MCQ/assertion-reasoning
- Provide correct answers and detailed solutions

Reference questions from past papers:
${samplesText}

Respond in this exact JSON format:
{
  "questions": [
    {
      "id": "<unique_id>",
      "questionNumber": <number>,
      "section": "AI Generated",
      "type": "<mcq|short-answer|long-answer|case-based|fill-blank|true-false|assertion-reasoning|coding>",
      "question": "<question text with LaTeX where appropriate>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"] or null,
      "correctAnswer": "<answer>",
      "solution": "<detailed step-by-step solution>",
      "marks": ${marks},
      "topic": "<topic>"
    }
  ]
}`;
}

/**
 * Build prompt for image-based answer evaluation (vision)
 */
export function buildImageCheckPrompt(
  subject: Subject,
  question: string,
  correctAnswer: string,
  solution: string,
  marks: number,
): string {
  return `You are an expert CBSE ${subject} examiner. The student has submitted a handwritten answer as an image.

Question (${marks} marks): ${question}

Expected Answer: ${correctAnswer}

Reference Solution: ${solution}

Please evaluate the handwritten answer in the image:
1. Read and understand the student's handwritten work
2. Check for correctness of method, steps, and final answer
3. Award appropriate marks based on CBSE marking scheme

Respond in this exact JSON format:
{
  "questionId": "",
  "score": <number>,
  "maxMarks": ${marks},
  "feedback": "<markdown feedback>",
  "keyPointsMissed": ["<point1>", "<point2>"],
  "isCorrect": <boolean>
}`;
}
