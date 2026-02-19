'use client';

import { useRef, useEffect } from 'react';

interface PYQTextAnswerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

export default function PYQTextAnswer({
  value,
  onChange,
  disabled = false,
  placeholder = 'Type your answer...',
  rows = 4,
}: PYQTextAnswerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(
        textareaRef.current.scrollHeight,
        rows * 24
      ) + 'px';
    }
  }, [value, rows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      className="input-base resize-none disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}
