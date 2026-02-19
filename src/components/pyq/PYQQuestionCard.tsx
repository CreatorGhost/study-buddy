'use client';

import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Flag } from 'lucide-react';
import PYQOptionList from './PYQOptionList';
import PYQTextAnswer from './PYQTextAnswer';
import PYQLongAnswer from './PYQLongAnswer';
import PYQSolution from './PYQSolution';
import PYQAIFeedback from './PYQAIFeedback';
import { detectLanguage } from '@/lib/pyq-utils';
import type { PYQQuestion, PYQAnswer, PYQAIFeedback as PYQAIFeedbackType } from '@/types';

const PYQCodeEditor = dynamic(() => import('./PYQCodeEditor'), { ssr: false });

interface PYQQuestionCardProps {
  question: PYQQuestion;
  index: number;
  total: number;
  answer: PYQAnswer;
  onAnswer: (answer: Partial<PYQAnswer>) => void;
  showResult?: boolean;
  autoResult?: { isCorrect: boolean; correctAnswer: string };
  aiFeedback?: PYQAIFeedbackType;
  onToggleFlag: () => void;
}

const typeLabels: Record<string, string> = {
  mcq: 'MCQ',
  'assertion-reasoning': 'Assertion & Reasoning',
  'short-answer': 'Short Answer',
  'long-answer': 'Long Answer',
  'case-based': 'Case Based',
  'fill-blank': 'Fill in the Blank',
  'true-false': 'True/False',
  coding: 'Coding',
};

export default function PYQQuestionCard({
  question,
  index,
  total,
  answer,
  onAnswer,
  showResult = false,
  autoResult,
  aiFeedback,
  onToggleFlag,
}: PYQQuestionCardProps) {
  const renderInput = () => {
    switch (question.type) {
      case 'mcq':
      case 'assertion-reasoning':
        return (
          <PYQOptionList
            options={question.options || []}
            selectedOption={answer.selectedOption}
            onSelect={(opt) => onAnswer({ selectedOption: opt, isAnswered: true })}
            disabled={showResult}
            showResult={showResult}
            correctAnswer={autoResult?.correctAnswer}
          />
        );

      case 'true-false':
        return (
          <PYQOptionList
            options={['True', 'False']}
            selectedOption={answer.selectedOption}
            onSelect={(opt) => onAnswer({ selectedOption: opt, isAnswered: true })}
            disabled={showResult}
            showResult={showResult}
            correctAnswer={autoResult?.correctAnswer}
          />
        );

      case 'fill-blank':
        return (
          <input
            type="text"
            value={answer.textAnswer || ''}
            onChange={(e) =>
              onAnswer({
                textAnswer: e.target.value,
                isAnswered: e.target.value.trim().length > 0,
              })
            }
            disabled={showResult}
            placeholder="Type your answer..."
            className="input-base disabled:opacity-50 disabled:cursor-not-allowed"
          />
        );

      case 'short-answer':
        return (
          <PYQTextAnswer
            value={answer.textAnswer || ''}
            onChange={(val) =>
              onAnswer({
                textAnswer: val,
                isAnswered: val.trim().length > 0,
              })
            }
            disabled={showResult}
            rows={4}
          />
        );

      case 'long-answer':
        return (
          <PYQLongAnswer
            textValue={answer.textAnswer || ''}
            onTextChange={(val) =>
              onAnswer({
                textAnswer: val,
                isAnswered: val.trim().length > 0 || !!answer.imageBase64,
              })
            }
            imageBase64={answer.imageBase64}
            onImageChange={(base64) =>
              onAnswer({
                imageBase64: base64,
                isAnswered: !!base64 || (answer.textAnswer || '').trim().length > 0,
              })
            }
            disabled={showResult}
          />
        );

      case 'coding': {
        const lang = detectLanguage(question.question);
        return (
          <PYQCodeEditor
            value={answer.codeAnswer || ''}
            onChange={(val) =>
              onAnswer({
                codeAnswer: val,
                isAnswered: val.trim().length > 0,
              })
            }
            language={lang}
            disabled={showResult}
          />
        );
      }

      case 'case-based':
        // Case-based: show passage, then render sub-parts
        // If the question has options, render as MCQ; otherwise as short-answer
        if (question.options && question.options.length > 0) {
          return (
            <PYQOptionList
              options={question.options}
              selectedOption={answer.selectedOption}
              onSelect={(opt) => onAnswer({ selectedOption: opt, isAnswered: true })}
              disabled={showResult}
              showResult={showResult}
              correctAnswer={autoResult?.correctAnswer}
            />
          );
        }
        return (
          <PYQTextAnswer
            value={answer.textAnswer || ''}
            onChange={(val) =>
              onAnswer({
                textAnswer: val,
                isAnswered: val.trim().length > 0,
              })
            }
            disabled={showResult}
            rows={4}
            placeholder="Write your answer for this case-based question..."
          />
        );

      default:
        return (
          <PYQTextAnswer
            value={answer.textAnswer || ''}
            onChange={(val) =>
              onAnswer({
                textAnswer: val,
                isAnswered: val.trim().length > 0,
              })
            }
            disabled={showResult}
            rows={4}
          />
        );
    }
  };

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 animate-fade-in-up space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-text-faint">
            {index + 1} / {total}
          </span>
          <span className="chip chip-accent">
            {question.marks} mark{question.marks !== 1 ? 's' : ''}
          </span>
          <span className="chip bg-bg-elevated text-text-muted border border-border">
            {typeLabels[question.type] || question.type}
          </span>
        </div>

        <button
          onClick={onToggleFlag}
          className={`p-1.5 rounded-md transition-colors duration-100 ${
            answer.isFlagged
              ? 'text-warning bg-warning/10'
              : 'text-text-faint hover:text-text-secondary hover:bg-bg-hover'
          }`}
          aria-label={answer.isFlagged ? 'Unflag question' : 'Flag question'}
        >
          <Flag size={14} fill={answer.isFlagged ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Question text */}
      <div className="text-[13px] font-medium text-text-primary leading-relaxed prose-study">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
        >
          {question.question}
        </ReactMarkdown>
      </div>

      {/* Answer input */}
      {renderInput()}

      {/* Result section */}
      {showResult && (
        <div className="space-y-3 pt-2">
          {/* Auto-check result indicator */}
          {autoResult && (
            <div className={`text-[12px] font-medium ${autoResult.isCorrect ? 'text-success' : 'text-error'}`}>
              {autoResult.isCorrect ? 'Correct!' : 'Incorrect'}
            </div>
          )}

          {/* Solution */}
          <PYQSolution
            correctAnswer={question.correctAnswer}
            solution={question.solution}
            marks={question.marks}
          />

          {/* AI Feedback */}
          {aiFeedback && (
            <PYQAIFeedback feedback={aiFeedback} />
          )}
        </div>
      )}
    </div>
  );
}
