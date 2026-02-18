'use client';

import { Subject } from '@/types';

const subjects: Subject[] = [
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'English',
  'History',
  'Geography',
  'Economics',
  'Political Science',
];

interface SubjectSelectorProps {
  value: Subject;
  onChange: (subject: Subject) => void;
  variant?: 'dropdown' | 'chips';
}

export { subjects };

export default function SubjectSelector({ value, onChange, variant = 'dropdown' }: SubjectSelectorProps) {
  if (variant === 'chips') {
    return (
      <div className="flex flex-wrap gap-2">
        {subjects.map(subject => (
          <button
            key={subject}
            onClick={() => onChange(subject)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
              ${value === subject
                ? 'accent-gradient text-white accent-glow'
                : 'bg-bg-elevated text-text-muted hover:text-text-secondary border border-border hover:border-border-hover'
              }
            `}
          >
            {subject}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as Subject)}
      className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary
                 focus:outline-none focus:border-accent-2 transition-colors cursor-pointer"
    >
      {subjects.map(subject => (
        <option key={subject} value={subject}>
          {subject}
        </option>
      ))}
    </select>
  );
}
