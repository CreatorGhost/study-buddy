'use client';

import { QuizResult, FlashcardDeck, StudyProgress, Subject, WeakTopic, PYQSessionResult } from '@/types';

const KEYS = {
  quizResults: 'studybuddy_quiz_results',
  flashcardDecks: 'studybuddy_flashcard_decks',
  studyProgress: 'studybuddy_progress',
  streak: 'studybuddy_streak',
  lastStudyDate: 'studybuddy_last_study',
  pyqResults: 'studybuddy_pyq_results',
  pyqSessions: 'studybuddy_pyq_sessions',
  weakTopics: 'studybuddy_weak_topics',
};

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // QuotaExceededError or SecurityError — silently fail
  }
}

// Quiz Results
export function getQuizResults(): QuizResult[] {
  return getItem<QuizResult[]>(KEYS.quizResults, []);
}

export function saveQuizResult(result: QuizResult): void {
  const results = getQuizResults();
  results.unshift(result);
  setItem(KEYS.quizResults, results);
  updateStudyProgress(result.subject, result.topic, result.score / result.total);
  updateStreak();
}

export function getQuizResultsBySubject(subject: Subject): QuizResult[] {
  return getQuizResults().filter(r => r.subject === subject);
}

// Flashcard Decks
export function getFlashcardDecks(): FlashcardDeck[] {
  return getItem<FlashcardDeck[]>(KEYS.flashcardDecks, []);
}

export function saveFlashcardDeck(deck: FlashcardDeck): void {
  const decks = getFlashcardDecks();
  const existingIndex = decks.findIndex(d => d.id === deck.id);
  if (existingIndex >= 0) {
    decks[existingIndex] = deck;
  } else {
    decks.unshift(deck);
  }
  setItem(KEYS.flashcardDecks, decks);
  updateStreak();
}

export function deleteFlashcardDeck(id: string): void {
  const decks = getFlashcardDecks().filter(d => d.id !== id);
  setItem(KEYS.flashcardDecks, decks);
}

// Study Progress
export function getStudyProgress(): StudyProgress[] {
  return getItem<StudyProgress[]>(KEYS.studyProgress, []);
}

function updateStudyProgress(subject: Subject, topic: string, scorePercent: number): void {
  const progress = getStudyProgress();
  let subjectProgress = progress.find(p => p.subject === subject);

  if (!subjectProgress) {
    subjectProgress = {
      subject,
      topicsStudied: [],
      quizScores: [],
      totalTimeMinutes: 0,
    };
    progress.push(subjectProgress);
  }

  if (!subjectProgress.topicsStudied.includes(topic)) {
    subjectProgress.topicsStudied.push(topic);
  }

  subjectProgress.quizScores.push({
    topic,
    score: scorePercent,
    date: Date.now(),
  });

  setItem(KEYS.studyProgress, progress);
}

// Streak tracking
function updateStreak(): void {
  const today = new Date().toDateString();
  const lastDate = getItem<string>(KEYS.lastStudyDate, '');

  if (lastDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const currentStreak = getItem<number>(KEYS.streak, 0);

  if (lastDate === yesterday) {
    setItem(KEYS.streak, currentStreak + 1);
  } else if (lastDate !== today) {
    setItem(KEYS.streak, 1);
  }

  setItem(KEYS.lastStudyDate, today);
}

export function getStreak(): number {
  return getItem<number>(KEYS.streak, 0);
}

// PYQ Practice Results (localStorage fallback when Supabase unavailable)
export interface PYQPracticeResult {
  id: string;
  subject: Subject;
  marksCategory: number;
  year: number | null;
  questionsAttempted: number;
  questionsCorrect: number;
  scorePercentage: number;
  weakTopics: string[];
  answers: Record<string, string>;
  createdAt: number;
}

export function getPYQResults(): PYQPracticeResult[] {
  return getItem<PYQPracticeResult[]>(KEYS.pyqResults, []);
}

export function savePYQResult(result: PYQPracticeResult): void {
  const results = getPYQResults();
  results.unshift(result);
  if (results.length > 50) results.length = 50;
  setItem(KEYS.pyqResults, results);
  updateStreak();
}

export function getPYQResultsBySubject(subject: Subject): PYQPracticeResult[] {
  return getPYQResults().filter(r => r.subject === subject);
}

export function getPYQResultsByMarks(subject: Subject, marks: number): PYQPracticeResult[] {
  return getPYQResults().filter(r => r.subject === subject && r.marksCategory === marks);
}

// PYQ Session Results (full session data)
export function getPYQSessions(): PYQSessionResult[] {
  return getItem<PYQSessionResult[]>(KEYS.pyqSessions, []);
}

export function savePYQSession(session: PYQSessionResult): void {
  const sessions = getPYQSessions();
  sessions.unshift(session);
  // Keep max 50 sessions to avoid localStorage limits
  if (sessions.length > 50) sessions.length = 50;
  setItem(KEYS.pyqSessions, sessions);
  updateWeakTopics(session);
  updateStreak();
}

// Weak Topic Tracking
export function getWeakTopics(subject?: Subject): WeakTopic[] {
  const all = getItem<WeakTopic[]>(KEYS.weakTopics, []);
  if (subject) return all.filter(t => t.subject === subject);
  return all;
}

function updateWeakTopics(session: PYQSessionResult): void {
  const weakTopics = getItem<WeakTopic[]>(KEYS.weakTopics, []);

  for (const [topic, data] of Object.entries(session.topicBreakdown)) {
    if (data.total === 0) continue;

    const accuracy = data.maxMarks > 0 ? data.marks / data.maxMarks : 0;
    const existing = weakTopics.find(
      t => t.subject === session.subject && t.topic === topic,
    );

    if (existing) {
      // Rolling average with decay toward recent performance
      existing.accuracy = existing.accuracy * 0.4 + accuracy * 0.6;
      existing.totalAttempted += data.total;
      existing.lastAttempted = Date.now();
    } else {
      weakTopics.push({
        subject: session.subject,
        topic,
        accuracy,
        totalAttempted: data.total,
        lastAttempted: Date.now(),
      });
    }
  }

  // Sort by accuracy ascending (weakest first)
  weakTopics.sort((a, b) => a.accuracy - b.accuracy);

  setItem(KEYS.weakTopics, weakTopics);
}

export function getTopWeakTopics(subject: Subject, count = 3): WeakTopic[] {
  return getWeakTopics(subject)
    .filter(t => t.accuracy < 0.6 && t.totalAttempted >= 2)
    .slice(0, count);
}

// Dashboard stats
export function getDashboardStats() {
  const quizResults = getQuizResults();
  const progress = getStudyProgress();
  const streak = getStreak();

  const totalQuizzes = quizResults.length;
  const averageScore = totalQuizzes > 0
    ? quizResults.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) / totalQuizzes
    : 0;

  const allTopics = new Set<string>();
  progress.forEach(p => p.topicsStudied.forEach(t => allTopics.add(t)));

  // Find weak areas (topics with avg score < 60%)
  const topicScores = new Map<string, { total: number; count: number; subject: Subject }>();
  quizResults.forEach(r => {
    const key = `${r.subject}:${r.topic}`;
    const existing = topicScores.get(key);
    if (!existing) {
      topicScores.set(key, { total: 0, count: 0, subject: r.subject });
    }
    const entry = topicScores.get(key)!;
    entry.total += (r.score / r.total) * 100;
    entry.count += 1;
  });

  const weakAreas = Array.from(topicScores.entries())
    .map(([key, data]) => ({
      topic: key.split(':')[1],
      subject: data.subject,
      avgScore: data.total / data.count,
    }))
    .filter(a => a.avgScore < 60)
    .sort((a, b) => a.avgScore - b.avgScore);

  // Subject-wise progress
  const subjectStats = progress.map(p => {
    const scores = p.quizScores;
    const avg = scores.length > 0
      ? scores.reduce((s, q) => s + q.score * 100, 0) / scores.length
      : 0;
    return {
      subject: p.subject,
      topicsCount: p.topicsStudied.length,
      avgScore: avg,
      quizCount: scores.length,
    };
  });

  // PYQ stats
  const pyqSessions = getPYQSessions();
  const pyqWeakTopics = getWeakTopics();
  const totalPYQSessions = pyqSessions.length;
  const pyqAverageScore = totalPYQSessions > 0
    ? Math.round(pyqSessions.reduce((sum, s) => sum + (s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0), 0) / totalPYQSessions)
    : 0;

  // PYQ per-subject breakdown
  const pyqSubjectMap = new Map<string, { sessions: number; totalScore: number; maxScore: number }>();
  for (const s of pyqSessions) {
    const existing = pyqSubjectMap.get(s.subject);
    if (existing) {
      existing.sessions++;
      existing.totalScore += s.totalScore;
      existing.maxScore += s.maxScore;
    } else {
      pyqSubjectMap.set(s.subject, { sessions: 1, totalScore: s.totalScore, maxScore: s.maxScore });
    }
  }
  const pyqSubjectStats = Array.from(pyqSubjectMap.entries()).map(([subject, data]) => ({
    subject,
    sessions: data.sessions,
    avgScore: data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0,
  }));

  // Recent PYQ sessions (last 10)
  const recentPYQ = pyqSessions.slice(0, 10).map(s => ({
    id: s.id,
    subject: s.subject,
    totalScore: s.totalScore,
    maxScore: s.maxScore,
    questionCount: s.questions?.length ?? 0,
    createdAt: s.createdAt,
  }));

  return {
    totalQuizzes,
    averageScore: Math.round(averageScore),
    totalTopics: allTopics.size,
    streak,
    weakAreas,
    subjectStats,
    recentQuizzes: quizResults.slice(0, 10),
    totalPYQSessions,
    pyqAverageScore,
    pyqSubjectStats,
    pyqWeakTopics: pyqWeakTopics.filter(t => t.accuracy < 0.6 && t.totalAttempted >= 2).slice(0, 5),
    recentPYQ,
  };
}
