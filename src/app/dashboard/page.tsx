'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { ProgressBar, StatCard } from '@/components/ProgressChart';
import { getDashboardStats } from '@/lib/storage';
import { Trophy, BookOpen, Brain, Flame, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  totalQuizzes: number;
  averageScore: number;
  totalTopics: number;
  streak: number;
  weakAreas: { topic: string; subject: string; avgScore: number }[];
  subjectStats: { subject: string; topicsCount: number; avgScore: number; quizCount: number }[];
  recentQuizzes: { id: string; subject: string; topic: string; score: number; total: number; date: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);

  useEffect(() => {
    setStats(getDashboardStats() as DashboardData);
  }, []);

  if (!stats) return null;

  const isEmpty = stats.totalQuizzes === 0 && stats.totalTopics === 0;

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="px-6 py-4 border-b border-border">
          <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-muted">Track your progress</p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in-up">
              <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center mb-4 accent-glow">
                <Trophy size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">No data yet</h2>
              <p className="text-sm text-text-muted mb-6 text-center max-w-sm">
                Take a quiz or study a topic to start tracking your progress
              </p>
              <div className="flex gap-3">
                <Link
                  href="/learn"
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary
                             hover:border-border-hover hover:text-text-primary transition-all"
                >
                  Start Learning
                </Link>
                <Link
                  href="/quiz"
                  className="px-4 py-2 rounded-lg accent-gradient text-sm font-medium text-white
                             hover:accent-glow transition-all"
                >
                  Take a Quiz
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Quizzes Taken"
                  value={stats.totalQuizzes}
                  icon={<Brain size={18} className="text-accent-2" />}
                />
                <StatCard
                  label="Average Score"
                  value={`${stats.averageScore}%`}
                  icon={<Trophy size={18} className="text-accent-2" />}
                />
                <StatCard
                  label="Topics Studied"
                  value={stats.totalTopics}
                  icon={<BookOpen size={18} className="text-accent-2" />}
                />
                <StatCard
                  label="Study Streak"
                  value={`${stats.streak} days`}
                  icon={<Flame size={18} className="text-accent-2" />}
                />
              </div>

              {/* Subject progress */}
              {stats.subjectStats.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-medium text-text-primary mb-5">Subject Progress</h3>
                  <div className="space-y-4">
                    {stats.subjectStats.map(s => (
                      <ProgressBar
                        key={s.subject}
                        label={s.subject}
                        value={s.avgScore}
                        subtitle={`${s.quizCount} quizzes · ${s.topicsCount} topics`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Weak areas */}
              {stats.weakAreas.length > 0 && (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <AlertTriangle size={16} className="text-warning" />
                    <h3 className="text-sm font-medium text-text-primary">Weak Areas</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.weakAreas.map((area, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-bg-elevated/50"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">{area.topic}</p>
                          <p className="text-xs text-text-muted">{area.subject}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-error">
                            {Math.round(area.avgScore)}%
                          </span>
                          <Link
                            href={`/quiz`}
                            className="flex items-center gap-1 text-xs text-accent-2 hover:underline"
                          >
                            Practice <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {stats.recentQuizzes.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-medium text-text-primary mb-5">Recent Quizzes</h3>
                  <div className="space-y-3">
                    {stats.recentQuizzes.map(quiz => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-bg-elevated/50"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">{quiz.topic}</p>
                          <p className="text-xs text-text-muted">
                            {quiz.subject} · {new Date(quiz.date).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            quiz.score / quiz.total >= 0.7
                              ? 'text-success'
                              : quiz.score / quiz.total >= 0.5
                              ? 'text-warning'
                              : 'text-error'
                          }`}
                        >
                          {quiz.score}/{quiz.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
