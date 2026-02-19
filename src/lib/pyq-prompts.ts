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
 * Data for one section used by the paper-generation prompt.
 */
export interface SectionPromptData {
  section: string;
  count: number;
  marksPerQuestion: number;
  rewordQuestions: Array<{
    question: string;
    options?: string[] | null;
    correctAnswer: string;
    type: string;
    topic?: string;
  }>;
  patternQuestions: Array<{
    question: string;
    options?: string[] | null;
    correctAnswer: string;
    type: string;
    topic?: string;
  }>;
  freshCount: number;
}

/**
 * Build prompt for generating a full CBSE sample paper.
 * 50% reworded PYQs + 50% fresh AI-generated.
 */
export function buildGeneratePaperPrompt(
  subject: Subject,
  totalQuestions: number,
  totalMarks: number,
  sections: SectionPromptData[],
): string {
  const structureLines = sections
    .map((s) => `- Section ${s.section}: ${s.count} questions × ${s.marksPerQuestion} mark${s.marksPerQuestion > 1 ? 's' : ''} each`)
    .join('\n');

  const sectionBlocks = sections.map((s) => {
    const isObjective = s.marksPerQuestion <= 1;
    const typeHint = isObjective
      ? 'MCQ/Objective — each must have exactly 4 options (a), (b), (c), (d) with one correct answer'
      : s.marksPerQuestion <= 2
      ? 'Short Answer'
      : s.marksPerQuestion <= 3
      ? 'Short/Medium Answer'
      : 'Long Answer / Case-based';

    let block = `=== SECTION ${s.section}: Generate ${s.count} questions (${s.marksPerQuestion} mark${s.marksPerQuestion > 1 ? 's' : ''} each) [${typeHint}] ===\n`;

    if (s.rewordQuestions.length > 0) {
      block += `\n[REWORD — modify these ${s.rewordQuestions.length} questions: change values, wording, options but keep the same concept]:\n`;
      s.rewordQuestions.forEach((q, i) => {
        block += `${i + 1}. ${q.question}\n`;
        if (q.options && q.options.length > 0) {
          block += `   Options: ${q.options.join(' | ')}\n`;
        }
        block += `   Answer: ${q.correctAnswer}\n`;
        if (q.topic) block += `   Topic: ${q.topic}\n`;
        block += '\n';
      });
    }

    if (s.patternQuestions.length > 0) {
      block += `[PATTERN — use these as style reference to generate ${s.freshCount} fresh questions on different topics]:\n`;
      s.patternQuestions.forEach((q, i) => {
        block += `${i + 1}. ${q.question}\n`;
        if (q.options && q.options.length > 0) {
          block += `   Options: ${q.options.join(' | ')}\n`;
        }
        block += `   Answer: ${q.correctAnswer}\n`;
        if (q.topic) block += `   Topic: ${q.topic}\n`;
        block += '\n';
      });
    } else if (s.rewordQuestions.length === 0) {
      block += `[No examples available — generate all ${s.count} questions fresh for ${subject} at ${s.marksPerQuestion}-mark difficulty]\n\n`;
    }

    return block;
  }).join('\n');

  return `You are a CBSE Class 12 ${subject} question paper setter creating a sample paper.

**Paper Structure:**
${structureLines}
**Total: ${totalQuestions} questions, ${totalMarks} marks**

For each section, I provide example questions from previous CBSE board exams.

**Your task:**
1. For questions marked [REWORD], modify them: change numerical values, wording, and options while keeping the same underlying concept and difficulty. The reworded question should test the same skill but be clearly different from the original.
2. For the remaining count, create FRESH original questions inspired by the [PATTERN] examples. Cover different topics from the ${subject} syllabus.
3. Ensure all questions are appropriate for CBSE Class 12 level.

${sectionBlocks}

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "questionNumber": 1,
      "section": "A",
      "type": "mcq|assertion-reasoning|true-false|fill-blank|short-answer|long-answer|case-based|coding",
      "question": "question text (use LaTeX: $formula$ for inline, $$formula$$ for display)",
      "options": ["(a) option1", "(b) option2", "(c) option3", "(d) option4"],
      "correctAnswer": "the correct answer",
      "solution": "Brief step-by-step explanation",
      "marks": 1,
      "topic": "Topic Name"
    }
  ]
}

IMPORTANT RULES:
- Number questions sequentially from 1 to ${totalQuestions} across all sections
- Section A questions MUST be type "mcq" (or "assertion-reasoning"/"true-false"/"fill-blank") with 4 options
- Sections B-E questions should NOT have options (set options to null) unless they are case-based MCQs
- Use LaTeX ($...$) for all mathematical/scientific expressions
- Every question must have correctAnswer and solution
- Cover diverse topics — do not repeat the same topic across questions
- Match real CBSE board exam difficulty exactly`;
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
