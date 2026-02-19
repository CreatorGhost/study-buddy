'use client';

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
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      className="input-base resize-none disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}
