'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface PYQFullPaperTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
}

export default function PYQFullPaperTimer({ durationMinutes, onTimeUp }: PYQFullPaperTimerProps) {
  const startTimeRef = useRef(Date.now());
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  const totalMs = durationMinutes * 60 * 1000;
  const [remaining, setRemaining] = useState(totalMs);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, totalMs - elapsed);
      setRemaining(left);

      if (left <= 0) {
        clearInterval(interval);
        onTimeUpRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [totalMs]);

  const totalSeconds = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isLow = remaining < 15 * 60 * 1000;

  const formatted = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-1.5 text-[12px] font-mono font-medium tabular-nums
                     ${isLow ? 'text-error animate-pulse' : 'text-text-muted'}`}>
      <Clock size={13} />
      {formatted}
    </div>
  );
}
