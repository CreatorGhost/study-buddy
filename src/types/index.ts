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
