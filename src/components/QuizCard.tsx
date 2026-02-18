'use client';

import { QuizQuestion } from '@/types';

interface QuizCardProps {
  question: QuizQuestion;
  index: number;
  total: number;
  selectedAnswer: string | undefined;
  onAnswer: (answer: string) => void;
  showResult?: boolean;
}

export default function QuizCard({
  question,
  index,
  total,
  selectedAnswer,
  onAnswer,
  showResult,
}: QuizCardProps) {
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-text-faint">
          {index + 1} / {total}
        </span>
        <span
          className={`chip ${
            question.difficulty === 'easy'
              ? 'chip-success'
              : question.difficulty === 'medium'
              ? 'chip-warning'
              : 'chip-error'
          }`}
        >
          {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
        </span>
      </div>

      {/* Question */}
      <p className="text-[13px] font-medium text-text-primary mb-4 leading-relaxed">
        {question.question}
      </p>

      {/* Options */}
      {question.options && (
        <div className="space-y-1.5">
          {question.options.map((option, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedAnswer === letter;
            const isCorrectOption = question.correctAnswer === letter;

            let style = 'border-border hover:border-border-hover';
            if (showResult) {
              if (isCorrectOption) {
                style = 'border-success bg-success-subtle';
              } else if (isSelected && !isCorrect) {
                style = 'border-error bg-error-subtle';
              }
            } else if (isSelected) {
              style = 'border-accent bg-accent-subtle';
            }

            return (
              <button
                key={i}
                onClick={() => !showResult && onAnswer(letter)}
                disabled={showResult}
                className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-md
                           border transition-colors duration-100 ${style}`}
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded text-[11px] font-medium flex items-center justify-center mt-0.5
                    ${isSelected || (showResult && isCorrectOption)
                      ? 'bg-accent text-white'
                      : 'bg-bg-elevated text-text-faint'
                    }`}
                >
                  {letter}
                </span>
                <span className="text-[13px] text-text-secondary leading-relaxed">{option}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Short answer */}
      {question.type === 'short-answer' && !showResult && (
        <textarea
          value={selectedAnswer || ''}
          onChange={e => onAnswer(e.target.value)}
          placeholder="Type your answer..."
          className="input-base resize-none"
          rows={3}
        />
      )}

      {/* Explanation */}
      {showResult && (
        <div className="mt-4 pt-3 border-t border-border">
          <span className={`text-[12px] font-medium ${isCorrect ? 'text-success' : 'text-error'}`}>
            {isCorrect ? 'Correct' : 'Incorrect'}
          </span>
          <p className="text-[12px] text-text-muted leading-relaxed mt-1">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
