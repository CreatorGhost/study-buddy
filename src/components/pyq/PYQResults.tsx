'use client';

import { RotateCcw, ArrowRight, TrendingDown } from 'lucide-react';

interface PYQResultsProps {
  totalScore: number;
  maxScore: number;
  topicBreakdown: Record<string, { correct: number; total: number; marks: number; maxMarks: number }>;
  weakTopics: string[];
  onRetryWrong: () => void;
  onNewSession: () => void;
  onPracticeWeakTopics: () => void;
}

export default function PYQResults({
  totalScore,
  maxScore,
  topicBreakdown,
  weakTopics,
  onRetryWrong,
  onNewSession,
  onPracticeWeakTopics,
}: PYQResultsProps) {
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const strokeDasharray = `${percentage * 2.64} 264`;

  const getGrade = () => {
    if (percentage >= 90) return { label: 'Excellent', color: 'text-success' };
    if (percentage >= 70) return { label: 'Good', color: 'text-accent-light' };
    if (percentage >= 50) return { label: 'Keep practicing', color: 'text-warning' };
    return { label: 'Needs work', color: 'text-error' };
  };

  const grade = getGrade();

  const topics = Object.entries(topicBreakdown).sort(
    (a, b) => {
      const aPercent = a[1].maxMarks > 0 ? a[1].marks / a[1].maxMarks : 0;
      const bPercent = b[1].maxMarks > 0 ? b[1].marks / b[1].maxMarks : 0;
      return aPercent - bPercent;
    }
  );

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-6 animate-fade-in-up space-y-6">
      {/* Score Donut */}
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="6"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold text-text-primary">{percentage}%</span>
            <span className="text-[11px] text-text-faint">
              {totalScore}/{maxScore}
            </span>
          </div>
        </div>

        <h2 className={`text-[14px] font-medium ${grade.color} mb-1`}>{grade.label}</h2>
        <p className="text-[12px] text-text-muted">
          {totalScore} of {maxScore} marks scored
        </p>
      </div>

      {/* Topic Breakdown */}
      {topics.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-3">
            Topic Breakdown
          </h3>
          <div className="space-y-2.5">
            {topics.map(([topic, data]) => {
              const topicPercent = data.maxMarks > 0
                ? Math.round((data.marks / data.maxMarks) * 100)
                : 0;
              const isWeak = weakTopics.includes(topic);

              return (
                <div key={topic}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[12px] ${isWeak ? 'text-error' : 'text-text-secondary'}`}>
                      {topic}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {data.marks}/{data.maxMarks} marks
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        topicPercent >= 80
                          ? 'bg-success'
                          : topicPercent >= 50
                          ? 'bg-accent'
                          : 'bg-error'
                      }`}
                      style={{ width: `${topicPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-2">
            Weak Topics
          </h3>
          <div className="space-y-1.5">
            {weakTopics.map((topic) => (
              <div key={topic} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                <span className="text-[12px] text-error">{topic}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <button onClick={onRetryWrong} className="btn-ghost">
          <RotateCcw size={13} />
          Retry Wrong
        </button>
        {weakTopics.length > 0 && (
          <button onClick={onPracticeWeakTopics} className="btn-ghost">
            <TrendingDown size={13} />
            Practice Weak Topics
          </button>
        )}
        <button onClick={onNewSession} className="btn-primary">
          New Session
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
