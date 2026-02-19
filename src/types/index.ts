export type Subject =
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Mathematics'
  | 'Computer Science';

export type AgentType = 'orchestrator' | 'tutor' | 'quiz' | 'diagram' | 'flashcard';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentType;
  timestamp: number;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'assertion-reasoning' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizResult {
  id: string;
  subject: Subject;
  topic: string;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  score: number;
  total: number;
  date: number;
}

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  status: 'new' | 'got-it' | 'review';
  nextReview?: number;
  interval: number;
}

export interface FlashcardDeck {
  id: string;
  subject: Subject;
  topic: string;
  cards: FlashcardData[];
  createdAt: number;
}

export interface StudyProgress {
  subject: Subject;
  topicsStudied: string[];
  quizScores: { topic: string; score: number; date: number }[];
  totalTimeMinutes: number;
}

export interface StreamEvent {
  type: 'agent_selected' | 'text_delta' | 'tool_call' | 'done' | 'error';
  data: string;
  agent?: AgentType;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionType = 'mcq' | 'assertion-reasoning' | 'mixed';

export interface QuizConfig {
  subject: Subject;
  topic: string;
  numQuestions: number;
  difficulty: Difficulty;
  questionType: QuestionType;
}

// PYQ (Previous Year Questions) Types
export type PYQQuestionType =
  | 'mcq'
  | 'assertion-reasoning'
  | 'short-answer'
  | 'long-answer'
  | 'case-based'
  | 'fill-blank'
  | 'true-false'
  | 'coding';

export interface PYQQuestion {
  id: string;
  questionNumber: number;
  section: string;
  type: PYQQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  solution: string;
  marks: number;
  topic?: string;
  hasAlternative?: boolean;
  alternativeQuestion?: PYQQuestion;
}

export interface PYQSection {
  name: string;
  marksPerQuestion: number;
  totalQuestions: number;
  description?: string;
}

export interface PYQPaper {
  id: string;
  subject: Subject;
  year: number;
  setCode?: string;
  totalMarks: number;
  /** Duration of the exam in minutes */
  duration: number;
  sections: PYQSection[];
  questions: PYQQuestion[];
  sourceFile: string;
}

export interface PYQIndex {
  subjects: {
    [key in Subject]?: {
      years: number[];
      totalPapers: number;
      totalQuestions: number;
    };
  };
  papers: Array<{
    id: string;
    subject: Subject;
    year: number;
    setCode?: string;
    questionCount: number;
    filePath: string;
  }>;
}

// PYQ Practice Session Types
export type PYQPracticeMode = 'pyq' | 'ai-similar';

export interface PYQSessionConfig {
  subject: Subject;
  years: number[];
  marks: number[];
  questionCount: number;
  mode: PYQPracticeMode;
}

export interface PYQAnswer {
  questionId: string;
  type: PYQQuestionType;
  textAnswer?: string;
  selectedOption?: string;
  codeAnswer?: string;
  codeLanguage?: 'python' | 'cpp' | 'sql';
  imageBase64?: string;
  isAnswered: boolean;
  isFlagged: boolean;
}

export interface PYQAIFeedback {
  questionId: string;
  score: number;
  maxMarks: number;
  feedback: string;
  keyPointsMissed: string[];
  isCorrect: boolean;
}

export interface PYQSessionResult {
  id: string;
  subject: Subject;
  mode: PYQPracticeMode;
  years: number[];
  marks: number[];
  questions: PYQQuestion[];
  answers: Record<string, PYQAnswer>;
  autoResults: Record<string, { isCorrect: boolean; correctAnswer: string }>;
  aiFeedback: Record<string, PYQAIFeedback>;
  totalScore: number;
  maxScore: number;
  topicBreakdown: Record<string, { correct: number; total: number; marks: number; maxMarks: number }>;
  weakTopics: string[];
  createdAt: number;
}

export interface WeakTopic {
  subject: Subject;
  topic: string;
  accuracy: number;
  totalAttempted: number;
  lastAttempted: number;
}
