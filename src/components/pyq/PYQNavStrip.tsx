'use client';

import type { PYQAnswer } from '@/types';

interface PYQNavStripProps {
  total: number;
  currentIndex: number;
  answers: Record<string, PYQAnswer>;
  questionIds: string[];
  onNavigate: (index: number) => void;
}

export default function PYQNavStrip({
  total,
  currentIndex,
  answers,
  questionIds,
  onNavigate,
}: PYQNavStripProps) {
  const useSmall = total > 15;
  const dotSize = useSmall ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-[11px]';

  const getStatus = (index: number): 'current' | 'flagged' | 'answered' | 'unanswered' => {
    if (index === currentIndex) return 'current';
    const answer = answers[questionIds[index]];
    if (answer?.isFlagged) return 'flagged';
    if (answer?.isAnswered) return 'answered';
    return 'unanswered';
  };

  const statusStyles: Record<string, string> = {
    current: 'bg-accent text-white',
    flagged: 'bg-warning/20 text-warning',
    answered: 'bg-accent-subtle text-accent-light',
    unanswered: 'bg-bg-elevated text-text-faint',
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className={`flex flex-wrap gap-1.5 ${useSmall ? 'max-w-full' : ''}`}>
        {Array.from({ length: total }, (_, i) => {
          const status = getStatus(i);
          return (
            <button
              key={questionIds[i]}
              onClick={() => onNavigate(i)}
              className={`
                ${dotSize} rounded-md font-medium flex items-center justify-center
                transition-colors duration-100 shrink-0
                hover:ring-1 hover:ring-border-hover
                ${statusStyles[status]}
              `}
              aria-label={`Question ${i + 1} - ${status}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
