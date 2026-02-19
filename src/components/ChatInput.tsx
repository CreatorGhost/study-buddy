'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { Subject } from '@/types';
import SubjectSelector from './SubjectSelector';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  subject: Subject;
  onSubjectChange: (subject: Subject) => void;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled,
  subject,
  onSubjectChange,
  placeholder = 'Ask anything about your studies...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '20px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-bg-surface border border-border rounded-lg">
      <div className="px-3 pt-3 pb-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-muted
                     resize-none focus:outline-none leading-relaxed"
        />
      </div>
      <div className="flex items-center justify-between px-3 pb-2">
        <div className="flex items-center gap-3">
          <SubjectSelector value={subject} onChange={onSubjectChange} />
          <span className="text-[10px] text-text-muted hidden sm:inline">Shift+Enter for new line</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          aria-label="Send message"
          className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center
                     disabled:opacity-30 hover:bg-accent-light transition-colors duration-100 shrink-0"
        >
          {disabled ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ArrowUp size={14} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
