'use client';

import { QuizQuestion } from '@/types';
import { Trophy, RotateCcw, ArrowRight } from 'lucide-react';

interface QuizResultsProps {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onRetryWrong: () => void;
  onNewQuiz: () => void;
}

export default function QuizResults({ questions, answers, onRetryWrong, onNewQuiz }: QuizResultsProps) {
  const correct = questions.filter(q => answers[q.id] === q.correctAnswer).length;
  const total = questions.length;
  const percentage = Math.round((correct / total) * 100);
  const wrongCount = total - correct;

  const getGrade = () => {
    if (percentage >= 90) return { label: 'Excellent!', color: 'text-success' };
    if (percentage >= 70) return { label: 'Good Job!', color: 'text-accent-2' };
    if (percentage >= 50) return { label: 'Keep Practicing', color: 'text-warning' };
    return { label: 'Need More Study', color: 'text-error' };
  };

  const grade = getGrade();

  return (
    <div className="glass-card p-8 text-center animate-fade-in-up">
      {/* Score circle */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke="url(#scoreGradient)" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.64} 264`}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#455EB5" />
              <stop offset="100%" stopColor="#673FD7" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-text-primary">{percentage}%</span>
          <span className="text-xs text-text-muted">{correct}/{total}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        <Trophy size={20} className="text-accent-2" />
        <h2 className={`text-xl font-semibold ${grade.color}`}>{grade.label}</h2>
      </div>
      <p className="text-sm text-text-muted mb-8">
        You answered {correct} out of {total} questions correctly
      </p>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        {wrongCount > 0 && (
          <button
            onClick={onRetryWrong}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border
                       text-sm font-medium text-text-secondary hover:text-text-primary
                       hover:border-border-hover transition-all"
          >
            <RotateCcw size={16} />
            Retry Wrong ({wrongCount})
          </button>
        )}
        <button
          onClick={onNewQuiz}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg accent-gradient
                     text-sm font-medium text-white hover:accent-glow transition-all"
        >
          New Quiz
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
