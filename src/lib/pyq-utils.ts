import { PYQQuestion, PYQAnswer, PYQSessionResult, WeakTopic, Subject } from '@/types';

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
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');

  const student = normalize(studentAnswer);
  const correct = normalize(correctAnswer);

  // Empty answers never match
  if (!student || !correct) return false;

  if (student === correct) return true;

  // Check numeric equivalence
  const studentNum = parseFloat(student);
  const correctNum = parseFloat(correct);
  if (!isNaN(studentNum) && !isNaN(correctNum) && studentNum === correctNum) return true;

  // For short answers (< 5 chars), require exact match only
  if (correct.length < 5) return false;

  // For longer answers, check containment (student wrote the correct answer within their response)
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
  if (lower.includes('sql') || lower.includes('select') || lower.includes('table')) return 'sql';
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
    if (autoResults[q.id]?.isCorrect) {
      totalScore += q.marks;
    } else if (aiFeedback[q.id]) {
      totalScore += aiFeedback[q.id].score;
    }
  }

  return { totalScore, maxScore };
}
