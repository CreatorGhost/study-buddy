'use client';

interface PYQOptionListProps {
  options: string[];
  selectedOption?: string;
  onSelect: (option: string) => void;
  disabled?: boolean;
  showResult?: boolean;
  correctAnswer?: string;
}

export default function PYQOptionList({
  options,
  selectedOption,
  onSelect,
  disabled = false,
  showResult = false,
  correctAnswer,
}: PYQOptionListProps) {
  const isTrueFalse = options.length === 2 &&
    options.every(o => o === 'True' || o === 'False');

  if (isTrueFalse) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const isSelected = selectedOption === option;
          const isCorrectOption = correctAnswer === option;

          let style = 'border-border hover:border-border-hover';
          if (showResult) {
            if (isCorrectOption) {
              style = 'border-success bg-success-subtle';
            } else if (isSelected && !isCorrectOption) {
              style = 'border-error bg-error-subtle';
            }
          } else if (isSelected) {
            style = 'border-accent bg-accent-subtle';
          }

          return (
            <button
              key={option}
              onClick={() => !showResult && !disabled && onSelect(option)}
              disabled={showResult || disabled}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md
                         border transition-colors duration-100 ${style}`}
            >
              <span
                className={`shrink-0 w-5 h-5 rounded text-[11px] font-medium flex items-center justify-center
                  ${isSelected || (showResult && isCorrectOption)
                    ? 'bg-accent text-white'
                    : 'bg-bg-elevated text-text-faint'
                  }`}
              >
                {option[0]}
              </span>
              <span className="text-[13px] text-text-secondary">{option}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // MCQ / Assertion-Reasoning — A, B, C, D letter badges
  return (
    <div className="space-y-1.5">
      {options.map((option, i) => {
        const letter = String.fromCharCode(65 + i);
        const isSelected = selectedOption === letter;
        const isCorrectOption = correctAnswer === letter;

        let style = 'border-border hover:border-border-hover';
        if (showResult) {
          if (isCorrectOption) {
            style = 'border-success bg-success-subtle';
          } else if (isSelected && !isCorrectOption) {
            style = 'border-error bg-error-subtle';
          }
        } else if (isSelected) {
          style = 'border-accent bg-accent-subtle';
        }

        return (
          <button
            key={i}
            onClick={() => !showResult && !disabled && onSelect(letter)}
            disabled={showResult || disabled}
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
  );
}
