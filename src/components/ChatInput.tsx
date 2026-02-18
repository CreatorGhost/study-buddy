'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="glass-card p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted
                       resize-none focus:outline-none leading-relaxed"
          />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <SubjectSelector value={subject} onChange={onSubjectChange} />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="p-2 rounded-lg accent-gradient text-white disabled:opacity-40
                       hover:accent-glow transition-all duration-150 flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
