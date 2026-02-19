import { PYQQuestion, PYQAnswer, PYQSessionResult, WeakTopic, Subject } from '@/types';

export interface SectionGroup {
  section: string;
  label: string;
  marksPerQuestion: number;
  questions: PYQQuestion[];
}

const SECTION_ORDER = ['A', 'B', 'C', 'D', 'E'];

/**
 * Group questions by their section field (A, B, C, D, E).
 * Sorts sections in order and questions within each section by questionNumber.
 */
export function groupBySection(questions: PYQQuestion[]): SectionGroup[] {
  const map = new Map<string, PYQQuestion[]>();

  for (const q of questions) {
    const sec = (q.section || '').toUpperCase();
    if (!map.has(sec)) map.set(sec, []);
    map.get(sec)!.push(q);
  }

  const sections: SectionGroup[] = [];

  // Sort sections in canonical order, then any extras alphabetically
  const keys = [...map.keys()].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a);
    const bi = SECTION_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const sec of keys) {
    const qs = map.get(sec)!.sort((a, b) => {
      const aNum = typeof a.questionNumber === 'string'
        ? parseInt(a.questionNumber as unknown as string, 10) || 0
        : a.questionNumber;
      const bNum = typeof b.questionNumber === 'string'
        ? parseInt(b.questionNumber as unknown as string, 10) || 0
        : b.questionNumber;
      return aNum - bNum;
    });

    const marksPerQuestion = qs[0]?.marks || 1;
    const count = qs.length;
    const markWord = marksPerQuestion === 1 ? 'Mark' : 'Marks';
    const label = `Section ${sec} — ${marksPerQuestion} ${markWord} Each (${count} Question${count !== 1 ? 's' : ''})`;

    sections.push({ section: sec, label, marksPerQuestion, questions: qs });
  }

  return sections;
}

/**
 * Extract just the option letter from a correctAnswer string.
 * Handles formats like "(a) option text", "(a)", "a", "A", "a)", etc.
 * Returns the uppercase letter, or the original string if no letter pattern found.
 */
export function normalizeCorrectAnswer(correctAnswer: string): string {
  if (!correctAnswer) return '';
  const trimmed = correctAnswer.trim();

  // Already a single letter: "A", "a", "E", etc.
  if (/^[A-Za-z]$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Pattern: "(a) ...", "(a)...", "(E) ..."
  const parenMatch = trimmed.match(/^\(([A-Za-z])\)/);
  if (parenMatch) {
    return parenMatch[1].toUpperCase();
  }

  // Pattern: "a) ...", "E) ..."
  const bracketMatch = trimmed.match(/^([A-Za-z])\)/);
  if (bracketMatch) {
    return bracketMatch[1].toUpperCase();
  }

  // Pattern: "a. ...", "E. ..."
  const dotMatch = trimmed.match(/^([A-Za-z])\./);
  if (dotMatch) {
    return dotMatch[1].toUpperCase();
  }

  // For True/False questions (or any other fallthrough), uppercase to match caller
  return trimmed.toUpperCase();
}

/**
 * Check if a question requires a diagram/figure that we can't render.
 * These questions reference images that weren't captured during PDF parsing.
 */
const DIAGRAM_PATTERNS = [
  /\[diagram[:\s]/i,
  /\[figure[:\s]/i,
  /\[image[:\s]/i,
  /\[circuit[:\s]/i,
  /\[graph[:\s]/i,
  /shown\s+in\s+the\s+(figure|diagram|graph|circuit)/i,
  /refer\s+to\s+the\s+(figure|diagram)/i,
  /given\s+(figure|diagram|circuit)/i,
  /as\s+shown\s+(in\s+the\s+)?(figure|diagram|below)/i,
  /the\s+following\s+(figure|diagram|circuit|graph)/i,
];

export function requiresDiagram(question: string): boolean {
  return DIAGRAM_PATTERNS.some((pattern) => pattern.test(question));
}

/**
 * Fisher-Yates shuffle — returns a new shuffled array
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Check if a question type can be auto-checked (no AI needed)
 */
export function isAutoCheckable(type: string): boolean {
  return ['mcq', 'assertion-reasoning', 'true-false'].includes(type);
}

/**
 * Check if a question type needs fill-blank fuzzy matching
 */
export function isFillBlank(type: string): boolean {
  return type === 'fill-blank';
}

/**
 * Fuzzy string match for fill-in-the-blank answers
 * Normalizes whitespace, case, and common variations
 */
export function fuzzyMatch(studentAnswer: string, correctAnswer: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().trim()
      .replace(/[^\w\s.\-+]/g, '')
      .replace(/\s+/g, ' ');

  const student = normalize(studentAnswer);
  const correct = normalize(correctAnswer);

  if (!student || !correct) return false;

  if (student === correct) return true;

  const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
  if (NUMERIC_RE.test(student) && NUMERIC_RE.test(correct)) {
    if (Number(student) === Number(correct)) return true;
  }

  if (correct.length < 5) return false;

  if (student.includes(correct)) return true;

  return false;
}

/**
 * Compress an image file to JPEG base64 with max width
 */
export function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate topic breakdown from session answers
 */
export function calculateTopicBreakdown(
  questions: PYQQuestion[],
  answers: Record<string, PYQAnswer>,
  autoResults: Record<string, { isCorrect: boolean }>,
  aiFeedback: Record<string, { score: number; maxMarks: number; isCorrect: boolean }>,
): Record<string, { correct: number; total: number; marks: number; maxMarks: number }> {
  const breakdown: Record<string, { correct: number; total: number; marks: number; maxMarks: number }> = {};

  for (const q of questions) {
    const topic = q.topic || 'General';
    if (!breakdown[topic]) {
      breakdown[topic] = { correct: 0, total: 0, marks: 0, maxMarks: 0 };
    }

    breakdown[topic].total++;
    breakdown[topic].maxMarks += q.marks;

    const answer = answers[q.id];
    if (!answer?.isAnswered) continue;

    if (autoResults[q.id]) {
      if (autoResults[q.id].isCorrect) {
        breakdown[topic].correct++;
        breakdown[topic].marks += q.marks;
      }
    } else if (aiFeedback[q.id]) {
      breakdown[topic].marks += aiFeedback[q.id].score;
      if (aiFeedback[q.id].isCorrect) {
        breakdown[topic].correct++;
      }
    }
  }

  return breakdown;
}

/**
 * Identify weak topics (< 60% accuracy) from topic breakdown
 */
export function identifyWeakTopics(
  breakdown: Record<string, { correct: number; total: number; marks: number; maxMarks: number }>,
): string[] {
  return Object.entries(breakdown)
    .filter(([, data]) => data.total >= 1 && data.maxMarks > 0 && (data.marks / data.maxMarks) < 0.6)
    .sort((a, b) => {
      const aRatio = a[1].maxMarks > 0 ? a[1].marks / a[1].maxMarks : 0;
      const bRatio = b[1].maxMarks > 0 ? b[1].marks / b[1].maxMarks : 0;
      return aRatio - bRatio;
    })
    .map(([topic]) => topic);
}

/**
 * Get available marks options for a subject
 */
export function getMarksForSubject(subject: Subject): number[] {
  switch (subject) {
    case 'Mathematics':
      return [1, 2, 3, 5];
    case 'Computer Science':
      return [1, 2, 3, 4, 5];
    default: // Physics, Chemistry, Biology
      return [1, 2, 3, 5];
  }
}

/**
 * Detect coding language from question content
 */
export function detectLanguage(question: string): 'python' | 'cpp' | 'sql' {
  const lower = question.toLowerCase();
  const sqlPatterns = /\bsql\b|create\s+table|insert\s+into|select\s+.+?\bfrom\b|drop\s+table|alter\s+table|\bjoin\b|\bunion\b|\bwhere\b/;
  if (sqlPatterns.test(lower)) return 'sql';
  if (lower.includes('c++') || lower.includes('#include') || lower.includes('cout')) return 'cpp';
  return 'python';
}

/**
 * Calculate total score from auto-check and AI feedback results
 */
export function calculateTotalScore(
  questions: PYQQuestion[],
  autoResults: Record<string, { isCorrect: boolean }>,
  aiFeedback: Record<string, { score: number; maxMarks: number }>,
): { totalScore: number; maxScore: number } {
  let totalScore = 0;
  let maxScore = 0;

  for (const q of questions) {
    maxScore += q.marks;
    if (autoResults[q.id] !== undefined) {
      if (autoResults[q.id].isCorrect) totalScore += q.marks;
    } else if (aiFeedback[q.id]) {
      totalScore += aiFeedback[q.id].score;
    }
  }

  return { totalScore, maxScore };
}

/**
 * Parse a JSON response from an LLM, handling markdown code fences.
 */
export function parseJsonResponse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
