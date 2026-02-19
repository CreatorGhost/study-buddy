'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { PYQAIFeedback as PYQAIFeedbackType } from '@/types';

interface PYQAIFeedbackProps {
  feedback: PYQAIFeedbackType;
}

export default function PYQAIFeedback({ feedback }: PYQAIFeedbackProps) {
  const percentage = feedback.maxMarks > 0
    ? (feedback.score / feedback.maxMarks) * 100
    : 0;

  const getScoreStyle = () => {
    if (percentage >= 80) return { bg: 'bg-success-subtle', text: 'text-success', border: 'border-success/20' };
    if (percentage >= 50) return { bg: 'bg-warning-subtle', text: 'text-warning', border: 'border-warning/20' };
    return { bg: 'bg-error-subtle', text: 'text-error', border: 'border-error/20' };
  };

  const scoreStyle = getScoreStyle();

  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-4 space-y-3 animate-fade-in-up">
      {/* Header with score badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {feedback.isCorrect ? (
            <CheckCircle2 size={14} className="text-success" />
          ) : percentage >= 50 ? (
            <AlertCircle size={14} className="text-warning" />
          ) : (
            <XCircle size={14} className="text-error" />
          )}
          <span className={`text-[12px] font-medium ${feedback.isCorrect ? 'text-success' : percentage >= 50 ? 'text-warning' : 'text-error'}`}>
            {feedback.isCorrect ? 'Correct' : percentage >= 50 ? 'Partially Correct' : 'Incorrect'}
          </span>
        </div>

        {/* Score badge */}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[12px] font-semibold
                         ${scoreStyle.bg} ${scoreStyle.text} border ${scoreStyle.border}`}>
          {feedback.score}/{feedback.maxMarks}
        </span>
      </div>

      {/* Feedback text */}
      {feedback.feedback && (
        <div className="text-[12px] text-text-secondary leading-relaxed prose-study">
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
          >
            {feedback.feedback}
          </ReactMarkdown>
        </div>
      )}

      {/* Key points missed */}
      {feedback.keyPointsMissed.length > 0 && (
        <div className="pt-3 border-t border-border">
          <span className="text-[11px] font-medium text-text-faint uppercase tracking-wider block mb-2">
            Key Points Missed
          </span>
          <ul className="space-y-1">
            {feedback.keyPointsMissed.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-error mt-1.5 shrink-0" />
                <span className="text-[12px] text-error leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
