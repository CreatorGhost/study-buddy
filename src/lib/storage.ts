'use client';

import { QuizResult, FlashcardDeck, StudyProgress, Subject } from '@/types';

const KEYS = {
  quizResults: 'studybuddy_quiz_results',
  flashcardDecks: 'studybuddy_flashcard_decks',
  studyProgress: 'studybuddy_progress',
  streak: 'studybuddy_streak',
  lastStudyDate: 'studybuddy_last_study',
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
  localStorage.setItem(key, JSON.stringify(value));
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

  return {
    totalQuizzes,
    averageScore: Math.round(averageScore),
    totalTopics: allTopics.size,
    streak,
    weakAreas,
    subjectStats,
    recentQuizzes: quizResults.slice(0, 10),
  };
}
