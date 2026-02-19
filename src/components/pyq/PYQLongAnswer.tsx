'use client';

import { useState } from 'react';
import { Type, Camera } from 'lucide-react';
import PYQTextAnswer from './PYQTextAnswer';
import PYQImageUpload from './PYQImageUpload';

interface PYQLongAnswerProps {
  textValue: string;
  onTextChange: (value: string) => void;
  imageBase64?: string;
  onImageChange: (base64: string | undefined) => void;
  disabled?: boolean;
}

type AnswerMode = 'type' | 'photo';

export default function PYQLongAnswer({
  textValue,
  onTextChange,
  imageBase64,
  onImageChange,
  disabled = false,
}: PYQLongAnswerProps) {
  const [mode, setMode] = useState<AnswerMode>(imageBase64 ? 'photo' : 'type');

  return (
    <div className="space-y-2.5">
      {/* Tab switcher */}
      <div className="flex border border-border rounded-md overflow-hidden w-fit">
        <button
          onClick={() => setMode('type')}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium
                     transition-colors duration-100
                     ${mode === 'type'
                       ? 'bg-accent-subtle text-accent-light'
                       : 'bg-bg-elevated text-text-muted hover:text-text-secondary'
                     }
                     disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Type size={12} />
          Type
        </button>
        <button
          onClick={() => setMode('photo')}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium
                     border-l border-border transition-colors duration-100
                     ${mode === 'photo'
                       ? 'bg-accent-subtle text-accent-light'
                       : 'bg-bg-elevated text-text-muted hover:text-text-secondary'
                     }
                     disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Camera size={12} />
          Photo
        </button>
      </div>

      {/* Content */}
      {mode === 'type' ? (
        <PYQTextAnswer
          value={textValue}
          onChange={onTextChange}
          disabled={disabled}
          placeholder="Write your detailed answer here..."
          rows={8}
        />
      ) : (
        <PYQImageUpload
          imageBase64={imageBase64}
          onImageChange={onImageChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}
