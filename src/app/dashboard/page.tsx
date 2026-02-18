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
        <header className="flex items-center px-4 h-12 border-b border-border shrink-0">
          <h1 className="text-[13px] font-semibold text-text-primary">Dashboard</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in-up">
              <Trophy size={24} className="text-text-faint mb-3" strokeWidth={1.5} />
              <h2 className="text-[15px] font-medium text-text-primary mb-1">No data yet</h2>
              <p className="text-[12px] text-text-muted mb-5 text-center max-w-xs">
                Take a quiz or study a topic to start tracking progress
              </p>
              <div className="flex gap-2">
                <Link href="/learn" className="btn-ghost">
                  Start Learning
                </Link>
                <Link href="/quiz" className="btn-primary">
                  Take a Quiz
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Quizzes Taken"
                  value={stats.totalQuizzes}
                  icon={<Brain size={14} className="text-accent" strokeWidth={1.75} />}
                />
                <StatCard
                  label="Average Score"
                  value={`${stats.averageScore}%`}
                  icon={<Trophy size={14} className="text-accent" strokeWidth={1.75} />}
                />
                <StatCard
                  label="Topics Studied"
                  value={stats.totalTopics}
                  icon={<BookOpen size={14} className="text-accent" strokeWidth={1.75} />}
                />
                <StatCard
                  label="Study Streak"
                  value={`${stats.streak}d`}
                  icon={<Flame size={14} className="text-accent" strokeWidth={1.75} />}
                />
              </div>

              {/* Subject Progress */}
              {stats.subjectStats.length > 0 && (
                <div className="bg-bg-surface border border-border rounded-lg p-5">
                  <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-4">Subject Progress</h3>
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

              {/* Weak Areas */}
              {stats.weakAreas.length > 0 && (
                <div className="bg-bg-surface border border-border rounded-lg p-5">
                  <div className="flex items-center gap-1.5 mb-4">
                    <AlertTriangle size={13} className="text-warning" />
                    <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Weak Areas</h3>
                  </div>
                  <div className="space-y-1">
                    {stats.weakAreas.map((area, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-3 -mx-1 rounded-md hover:bg-bg-elevated transition-colors"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-text-primary">{area.topic}</p>
                          <p className="text-[11px] text-text-faint">{area.subject}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] font-medium text-error">
                            {Math.round(area.avgScore)}%
                          </span>
                          <Link
                            href="/quiz"
                            className="flex items-center gap-1 text-[11px] text-accent-light hover:underline"
                          >
                            Practice <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Quizzes */}
              {stats.recentQuizzes.length > 0 && (
                <div className="bg-bg-surface border border-border rounded-lg p-5">
                  <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-4">Recent Quizzes</h3>
                  <div className="space-y-1">
                    {stats.recentQuizzes.map(quiz => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between py-2.5 px-3 -mx-1 rounded-md hover:bg-bg-elevated transition-colors"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-text-primary">{quiz.topic}</p>
                          <p className="text-[11px] text-text-faint">
                            {quiz.subject} · {new Date(quiz.date).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-[12px] font-medium ${
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
