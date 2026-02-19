'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { CheckCircle2 } from 'lucide-react';

interface PYQSolutionProps {
  correctAnswer: string;
  solution: string;
  marks: number;
}

export default function PYQSolution({ correctAnswer, solution, marks }: PYQSolutionProps) {
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-4 space-y-3 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-success" />
          <span className="text-[12px] font-medium text-success">Correct Answer</span>
        </div>
        <span className="chip chip-accent">{marks} mark{marks !== 1 ? 's' : ''}</span>
      </div>

      {/* Correct answer text */}
      <div className="text-[13px] text-text-primary leading-relaxed font-medium prose-study">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
        >
          {correctAnswer}
        </ReactMarkdown>
      </div>

      {/* Solution */}
      {solution && (
        <div className="pt-3 border-t border-border">
          <span className="text-[11px] font-medium text-text-faint uppercase tracking-wider block mb-2">
            Solution
          </span>
          <div className="text-[12px] text-text-secondary leading-relaxed prose-study">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {solution}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
