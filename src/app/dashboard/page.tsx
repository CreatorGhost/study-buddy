'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { ProgressBar, StatCard } from '@/components/ProgressChart';
import { getDashboardStats } from '@/lib/storage';
import { Trophy, BookOpen, Brain, Flame, AlertTriangle, ArrowRight, ClipboardList, Target } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  totalQuizzes: number;
  averageScore: number;
  totalTopics: number;
  streak: number;
  weakAreas: { topic: string; subject: string; avgScore: number }[];
  subjectStats: { subject: string; topicsCount: number; avgScore: number; quizCount: number }[];
  recentQuizzes: { id: string; subject: string; topic: string; score: number; total: number; date: number }[];
  totalPYQSessions: number;
  pyqAverageScore: number;
  pyqSubjectStats: { subject: string; sessions: number; avgScore: number }[];
  pyqWeakTopics: { subject: string; topic: string; accuracy: number; totalAttempted: number; lastAttempted: number }[];
  recentPYQ: { id: string; subject: string; totalScore: number; maxScore: number; questionCount: number; createdAt: number }[];
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);

  useEffect(() => {
    setStats(getDashboardStats() as DashboardData);
  }, []);

  // Skeleton loading state
  if (!stats) return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex items-center pl-14 md:pl-4 pr-4 h-12 border-b border-border shrink-0">
          <h1 className="text-[13px] font-semibold text-text-primary">Dashboard</h1>
        </header>
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-bg-surface border border-border rounded-lg p-4 animate-pulse">
                  <div className="w-7 h-7 rounded-md bg-bg-elevated mb-2" />
                  <div className="h-5 w-12 bg-bg-elevated rounded mb-1" />
                  <div className="h-3 w-20 bg-bg-elevated rounded" />
                </div>
              ))}
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-bg-surface border border-border rounded-lg p-5 animate-pulse">
                <div className="h-3 w-32 bg-bg-elevated rounded mb-4" />
                <div className="space-y-3">
                  <div className="h-2 w-full bg-bg-elevated rounded" />
                  <div className="h-2 w-3/4 bg-bg-elevated rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );

  const isEmpty = stats.totalQuizzes === 0 && stats.totalTopics === 0 && stats.totalPYQSessions === 0;

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden" aria-label="Dashboard">
        <header className="flex items-center pl-14 md:pl-4 pr-4 h-12 border-b border-border shrink-0">
          <h1 className="text-[13px] font-semibold text-text-primary">Dashboard</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-12">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in-up">
              <Trophy size={32} className="text-text-muted mb-4" strokeWidth={1.5} />
              <h2 className="text-[15px] font-medium text-text-primary mb-1">No data yet</h2>
              <p className="text-[13px] text-text-secondary mb-5 text-center max-w-xs">
                Take a quiz or practice PYQs to start tracking progress
              </p>
              <div className="flex gap-2">
                <Link href="/pyq" className="btn-ghost">
                  Practice PYQs
                </Link>
                <Link href="/quiz" className="btn-primary">
                  Take a Quiz
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
              {/* Stats */}
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-3">
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

              {/* PYQ Practice Stats */}
              {stats.totalPYQSessions > 0 && (
                <div className="bg-bg-surface border border-border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <ClipboardList size={13} className="text-accent" />
                      <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">PYQ Practice</h3>
                    </div>
                    <Link
                      href="/pyq"
                      className="flex items-center gap-1 text-[11px] text-accent-light hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
                    >
                      Practice More <ArrowRight size={10} />
                    </Link>
                  </div>

                  {/* PYQ summary row */}
                  <div className="grid grid-cols-2 gap-3 mb-4 max-w-md">
                    <div className="bg-bg-elevated rounded-md px-3 py-2.5">
                      <p className="text-[11px] text-text-muted mb-0.5">Sessions</p>
                      <p className="text-[15px] font-semibold text-text-primary">{stats.totalPYQSessions}</p>
                    </div>
                    <div className="bg-bg-elevated rounded-md px-3 py-2.5">
                      <p className="text-[11px] text-text-muted mb-0.5">Avg Score</p>
                      <p className={`text-[15px] font-semibold ${
                        stats.pyqAverageScore >= 70 ? 'text-success'
                          : stats.pyqAverageScore >= 50 ? 'text-warning'
                          : 'text-error'
                      }`}>{stats.pyqAverageScore}%</p>
                    </div>
                  </div>

                  {/* PYQ per-subject progress */}
                  {stats.pyqSubjectStats.length > 0 && (
                    <div className="space-y-3">
                      {stats.pyqSubjectStats.map(s => (
                        <ProgressBar
                          key={s.subject}
                          label={s.subject}
                          value={s.avgScore}
                          subtitle={`${s.sessions} session${s.sessions !== 1 ? 's' : ''}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PYQ Weak Topics */}
              {stats.pyqWeakTopics.length > 0 && (
                <div className="bg-bg-surface border border-border rounded-lg p-5">
                  <div className="flex items-center gap-1.5 mb-4">
                    <Target size={13} className="text-warning" />
                    <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">PYQ Weak Topics</h3>
                  </div>
                  <div className="space-y-1 max-h-[280px] overflow-y-auto">
                    {stats.pyqWeakTopics.map((topic, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-bg-elevated transition-colors duration-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-text-primary truncate">{topic.topic}</p>
                          <p className="text-[11px] text-text-muted truncate">
                            {topic.subject} · {topic.totalAttempted} attempt{topic.totalAttempted !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className={`text-[12px] font-medium ${
                            topic.accuracy >= 0.5 ? 'text-warning' : 'text-error'
                          }`}>
                            {Math.round(topic.accuracy * 100)}%
                          </span>
                          <Link
                            href={`/pyq?subject=${encodeURIComponent(topic.subject)}`}
                            className="flex items-center gap-1 text-[11px] text-accent-light hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
                          >
                            Practice <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject Progress */}
              {stats.subjectStats.length > 0 && (
                <div className="bg-bg-surface border border-border rounded-lg p-5">
                  <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-4">Subject Progress</h3>
                  <div className="space-y-3">
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
                  <div className="space-y-1 max-h-[280px] overflow-y-auto">
                    {stats.weakAreas.slice(0, 8).map((area, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-bg-elevated transition-colors duration-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-text-primary truncate">{area.topic}</p>
                          <p className="text-[11px] text-text-muted truncate">{area.subject}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className={`text-[12px] font-medium ${
                            area.avgScore >= 50 ? 'text-warning' : 'text-error'
                          }`}>
                            {Math.round(area.avgScore)}%
                          </span>
                          <Link
                            href={`/quiz?subject=${encodeURIComponent(area.subject)}&topic=${encodeURIComponent(area.topic)}`}
                            className="flex items-center gap-1 text-[11px] text-accent-light hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
                          >
                            Practice <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent PYQ Sessions */}
              {stats.recentPYQ.length > 0 && (
                <div className="bg-bg-surface border border-border rounded-lg p-5">
                  <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-4">Recent PYQ Sessions</h3>
                  <div className="space-y-1">
                    {stats.recentPYQ.map(session => {
                      const pct = session.maxScore > 0 ? session.totalScore / session.maxScore : 0;
                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-bg-elevated transition-colors duration-100"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-text-primary truncate">{session.subject}</p>
                            <p className="text-[11px] text-text-muted truncate">
                              {session.questionCount} questions · {formatDate(session.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`text-[12px] font-medium shrink-0 ml-3 ${
                              pct >= 0.7
                                ? 'text-success'
                                : pct >= 0.5
                                ? 'text-warning'
                                : 'text-error'
                            }`}
                          >
                            {session.totalScore}/{session.maxScore}
                          </span>
                        </div>
                      );
                    })}
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
                        className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-bg-elevated transition-colors duration-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-text-primary truncate">{quiz.topic}</p>
                          <p className="text-[11px] text-text-muted truncate">
                            {quiz.subject} · {formatDate(quiz.date)}
                          </p>
                        </div>
                        <span
                          className={`text-[12px] font-medium shrink-0 ml-3 ${
                            quiz.total > 0 && quiz.score / quiz.total >= 0.7
                              ? 'text-success'
                              : quiz.total > 0 && quiz.score / quiz.total >= 0.5
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
