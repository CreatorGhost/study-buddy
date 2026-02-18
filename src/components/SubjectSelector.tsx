'use client';

import { Subject } from '@/types';

const subjects: Subject[] = [
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
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
      <div className="flex flex-wrap gap-1.5">
        {subjects.map(subject => (
          <button
            key={subject}
            onClick={() => onChange(subject)}
            className={`
              px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
              ${value === subject
                ? 'bg-accent text-white'
                : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
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
      className="bg-bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-secondary
                 focus:outline-none focus:border-accent transition-colors cursor-pointer"
    >
      {subjects.map(subject => (
        <option key={subject} value={subject}>
          {subject}
        </option>
      ))}
    </select>
  );
}
