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
      {/* Card */}
      <div
        className="flip-card w-full h-[280px] cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`flip-card-inner w-full h-full relative ${isFlipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flip-card-front absolute inset-0 glass-card p-8 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium text-accent-2 mb-4 uppercase tracking-wider">
              Question
            </span>
            <p className="text-lg font-medium text-text-primary text-center leading-relaxed">
              {card.front}
            </p>
            <span className="text-xs text-text-muted mt-6">Tap to reveal answer</span>
          </div>

          {/* Back */}
          <div className="flip-card-back absolute inset-0 glass-card p-8 flex flex-col items-center justify-center border-accent-2/20">
            <span className="text-[10px] font-medium text-accent-3 mb-4 uppercase tracking-wider">
              Answer
            </span>
            <p className="text-base text-text-secondary text-center leading-relaxed">
              {card.back}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons (shown when flipped) */}
      {isFlipped && (
        <div className="flex items-center justify-center gap-3 mt-4 animate-fade-in">
          <button
            onClick={e => {
              e.stopPropagation();
              onMark(card.id, 'review');
              setIsFlipped(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-error/30
                       text-sm font-medium text-error hover:bg-error/10 transition-all"
          >
            <RotateCcw size={16} />
            Need Review
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onMark(card.id, 'got-it');
              setIsFlipped(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-success/30
                       text-sm font-medium text-success hover:bg-success/10 transition-all"
          >
            <Check size={16} />
            Got It
          </button>
        </div>
      )}
    </div>
  );
}
