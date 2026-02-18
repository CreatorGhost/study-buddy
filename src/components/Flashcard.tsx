'use client';

import { useState } from 'react';
import { FlashcardData } from '@/types';
import { Check, RotateCcw } from 'lucide-react';

interface FlashcardProps {
  card: FlashcardData;
  onMark: (id: string, status: 'got-it' | 'review') => void;
}

export default function Flashcard({ card, onMark }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className="flip-card w-full h-[240px] cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`flip-card-inner w-full h-full relative ${isFlipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flip-card-front absolute inset-0 bg-bg-surface border border-border rounded-lg p-6 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium text-text-faint mb-3 uppercase tracking-wider">
              Question
            </span>
            <p className="text-[14px] font-medium text-text-primary text-center leading-relaxed">
              {card.front}
            </p>
            <span className="text-[11px] text-text-faint mt-4">Click to reveal</span>
          </div>

          {/* Back */}
          <div className="flip-card-back absolute inset-0 bg-bg-surface border border-border-hover rounded-lg p-6 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium text-accent-light mb-3 uppercase tracking-wider">
              Answer
            </span>
            <p className="text-[13px] text-text-secondary text-center leading-relaxed">
              {card.back}
            </p>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="flex items-center justify-center gap-2 mt-4 animate-fade-in">
          <button
            onClick={e => {
              e.stopPropagation();
              onMark(card.id, 'review');
              setIsFlipped(false);
            }}
            className="btn-ghost text-error border-error/20 hover:bg-error-subtle"
          >
            <RotateCcw size={13} />
            Review
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onMark(card.id, 'got-it');
              setIsFlipped(false);
            }}
            className="btn-ghost text-success border-success/20 hover:bg-success-subtle"
          >
            <Check size={13} />
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
