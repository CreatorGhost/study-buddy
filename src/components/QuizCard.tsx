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
    <div className="glass-card p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-text-muted">
          Question {index + 1} of {total}
        </span>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-md ${
            question.difficulty === 'easy'
              ? 'bg-success/10 text-success'
              : question.difficulty === 'medium'
              ? 'bg-warning/10 text-warning'
              : 'bg-error/10 text-error'
          }`}
        >
          {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
        </span>
      </div>

      {/* Question */}
      <h3 className="text-base font-medium text-text-primary mb-5 leading-relaxed">
        {question.question}
      </h3>

      {/* Options */}
      {question.options && (
        <div className="space-y-2.5">
          {question.options.map((option, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedAnswer === letter;
            const isCorrectOption = question.correctAnswer === letter;

            let style = 'border-border hover:border-border-hover bg-bg-elevated/50';
            if (showResult) {
              if (isCorrectOption) {
                style = 'border-success bg-success/10';
              } else if (isSelected && !isCorrect) {
                style = 'border-error bg-error/10';
              }
            } else if (isSelected) {
              style = 'border-accent-2 bg-accent-2/10';
            }

            return (
              <button
                key={i}
                onClick={() => !showResult && onAnswer(letter)}
                disabled={showResult}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg
                           border transition-all duration-150 ${style}`}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold
                    ${isSelected || (showResult && isCorrectOption)
                      ? 'accent-gradient text-white'
                      : 'bg-bg-base text-text-muted'
                    }`}
                >
                  {letter}
                </span>
                <span className="text-sm text-text-secondary leading-relaxed">{option}</span>
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
          className="w-full bg-bg-elevated border border-border rounded-lg p-3 text-sm text-text-primary
                     placeholder:text-text-muted focus:outline-none focus:border-accent-2 resize-none"
          rows={3}
        />
      )}

      {/* Explanation (shown after result) */}
      {showResult && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-medium ${isCorrect ? 'text-success' : 'text-error'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
