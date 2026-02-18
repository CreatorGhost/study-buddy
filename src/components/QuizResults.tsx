'use client';

import { QuizQuestion } from '@/types';
import { RotateCcw, ArrowRight } from 'lucide-react';

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
    if (percentage >= 90) return { label: 'Excellent', color: 'text-success' };
    if (percentage >= 70) return { label: 'Good', color: 'text-accent-light' };
    if (percentage >= 50) return { label: 'Keep practicing', color: 'text-warning' };
    return { label: 'Needs work', color: 'text-error' };
  };

  const grade = getGrade();

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-6 text-center animate-fade-in-up">
      {/* Score */}
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke="var(--accent)" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.64} 264`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-text-primary">{percentage}%</span>
          <span className="text-[11px] text-text-faint">{correct}/{total}</span>
        </div>
      </div>

      <h2 className={`text-[14px] font-medium ${grade.color} mb-1`}>{grade.label}</h2>
      <p className="text-[12px] text-text-muted mb-6">
        {correct} of {total} correct
      </p>

      <div className="flex items-center justify-center gap-2">
        {wrongCount > 0 && (
          <button onClick={onRetryWrong} className="btn-ghost">
            <RotateCcw size={13} />
            Retry wrong ({wrongCount})
          </button>
        )}
        <button onClick={onNewQuiz} className="btn-primary">
          New quiz
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
