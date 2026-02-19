'use client';

import { useRef, useEffect, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

interface PYQCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'python' | 'cpp' | 'sql';
  disabled?: boolean;
}

const languageLabels: Record<string, string> = {
  python: 'Python',
  cpp: 'C++',
  sql: 'SQL',
};

function getLanguageExtension(lang: 'python' | 'cpp' | 'sql') {
  switch (lang) {
    case 'python': return python();
    case 'cpp': return cpp();
    case 'sql': return sql();
  }
}

const customTheme = EditorView.theme({
  '&': {
    backgroundColor: '#111113',
    fontSize: '13px',
    minHeight: '200px',
    maxHeight: '400px',
    borderRadius: '0 0 6px 6px',
  },
  '.cm-content': {
    fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
    padding: '12px 0',
    caretColor: '#5e6ad2',
  },
  '.cm-cursor': {
    borderLeftColor: '#5e6ad2',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(94, 106, 210, 0.25) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#0a0a0b',
    color: '#3a3b3e',
    borderRight: '1px solid rgba(255, 255, 255, 0.055)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: '#9b9ca0',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
});

export default function PYQCodeEditor({
  value,
  onChange,
  language,
  disabled = false,
}: PYQCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  onChangeRef.current = onChange;

  const createEditor = useCallback((lang: 'python' | 'cpp' | 'sql', initialDoc: string) => {
    if (!editorRef.current) return;

    // Destroy existing editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const extensions = [
      basicSetup,
      getLanguageExtension(lang),
      oneDark,
      customTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    ];

    if (disabled) {
      extensions.push(EditorState.readOnly.of(true));
    }

    const state = EditorState.create({
      doc: initialDoc,
      extensions,
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });
  }, [disabled]);

  // Keep value ref for initial editor creation
  const valueRef = useRef(value);
  valueRef.current = value;

  // Initialize and rebuild on language change
  useEffect(() => {
    createEditor(language, valueRef.current);
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [language, createEditor]);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: current.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div className="border border-border rounded-md overflow-hidden animate-fade-in-up">
      {/* Language tabs */}
      <div className="flex border-b border-border bg-bg-elevated">
        {(['python', 'cpp', 'sql'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => {
              if (lang !== language) {
                onChange(value);
                // Language change is handled via props by the parent
              }
            }}
            className={`px-3 py-1.5 text-[11px] font-medium transition-colors duration-100
              ${language === lang
                ? 'text-accent-light border-b border-accent bg-bg-surface'
                : 'text-text-muted hover:text-text-secondary'
              }`}
          >
            {languageLabels[lang]}
          </button>
        ))}
      </div>

      {/* Editor mount point */}
      <div ref={editorRef} />
    </div>
  );
}
