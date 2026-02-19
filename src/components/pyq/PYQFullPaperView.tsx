'use client';

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { CheckCircle2 } from 'lucide-react';
import PYQOptionList from './PYQOptionList';
import PYQTextAnswer from './PYQTextAnswer';
import PYQLongAnswer from './PYQLongAnswer';
import PYQSolution from './PYQSolution';
import PYQAIFeedback from './PYQAIFeedback';
import { groupBySection, detectLanguage, CBSE_PAPER_STRUCTURE, generatePaperInstructions } from '@/lib/pyq-utils';
import type { PYQQuestion, PYQAnswer, PYQAIFeedback as PYQAIFeedbackType, Subject } from '@/types';

const PYQCodeEditor = dynamic(() => import('./PYQCodeEditor'), { ssr: false });

const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeKatex];

interface PYQFullPaperViewProps {
  questions: PYQQuestion[];
  answers: Record<string, PYQAnswer>;
  onAnswer: (questionId: string, update: Partial<PYQAnswer>) => void;
  onSubmit: () => void;
  subject?: Subject;
  showResults?: boolean;
  autoResults?: Record<string, { isCorrect: boolean; correctAnswer: string }>;
  aiFeedback?: Record<string, PYQAIFeedbackType>;
}

export default function PYQFullPaperView({
  questions,
  answers,
  onAnswer,
  onSubmit,
  subject,
  showResults = false,
  autoResults = {},
  aiFeedback = {},
}: PYQFullPaperViewProps) {
  const sections = useMemo(() => groupBySection(questions), [questions]);
  const [activeSection, setActiveSection] = useState(sections[0]?.section || 'A');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track answered count per section
  const sectionAnsweredCounts = useMemo(() => {
    const counts: Record<string, { answered: number; total: number }> = {};
    for (const sec of sections) {
      counts[sec.section] = {
        total: sec.questions.length,
        answered: sec.questions.filter((q) => answers[q.id]?.isAnswered).length,
      };
    }
    return counts;
  }, [sections, answers]);

  // IntersectionObserver to detect active section during scroll
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const sec of sections) {
      const el = sectionRefs.current[sec.section];
      if (!el) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSection(sec.section);
            }
          }
        },
        { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  const scrollToSection = useCallback((section: string) => {
    const el = sectionRefs.current[section];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const renderQuestionInput = (question: PYQQuestion, answer: PYQAnswer) => {
    const disabled = showResults;
    const autoResult = autoResults[question.id];

    switch (question.type) {
      case 'mcq':
      case 'assertion-reasoning':
        return (
          <PYQOptionList
            options={question.options || []}
            selectedOption={answer.selectedOption}
            onSelect={(opt) => onAnswer(question.id, { selectedOption: opt, isAnswered: true })}
            disabled={disabled}
            showResult={showResults}
            correctAnswer={autoResult?.correctAnswer}
          />
        );

      case 'true-false':
        return (
          <PYQOptionList
            options={['True', 'False']}
            selectedOption={answer.selectedOption}
            onSelect={(opt) => onAnswer(question.id, { selectedOption: opt, isAnswered: true })}
            disabled={disabled}
            showResult={showResults}
            correctAnswer={autoResult?.correctAnswer}
          />
        );

      case 'fill-blank': {
        let fillStyle = '';
        if (showResults && autoResult) {
          fillStyle = autoResult.isCorrect
            ? 'border-success bg-success/5'
            : 'border-error bg-error/5';
        }
        return (
          <input
            type="text"
            value={answer.textAnswer || ''}
            onChange={(e) =>
              onAnswer(question.id, {
                textAnswer: e.target.value,
                isAnswered: e.target.value.trim().length > 0,
              })
            }
            disabled={disabled}
            placeholder="Type your answer..."
            className={`input-base disabled:cursor-not-allowed ${
              showResults ? fillStyle : ''
            } ${showResults ? 'disabled:opacity-100' : 'disabled:opacity-50'}`}
          />
        );
      }

      case 'short-answer':
        return (
          <PYQTextAnswer
            value={answer.textAnswer || ''}
            onChange={(val) =>
              onAnswer(question.id, {
                textAnswer: val,
                isAnswered: val.trim().length > 0,
              })
            }
            disabled={disabled}
            rows={4}
          />
        );

      case 'long-answer':
        return (
          <PYQLongAnswer
            textValue={answer.textAnswer || ''}
            onTextChange={(val) =>
              onAnswer(question.id, {
                textAnswer: val,
                isAnswered: val.trim().length > 0 || !!answer.imageBase64,
              })
            }
            imageBase64={answer.imageBase64}
            onImageChange={(base64) =>
              onAnswer(question.id, {
                imageBase64: base64,
                isAnswered: !!base64 || (answer.textAnswer || '').trim().length > 0,
              })
            }
            disabled={disabled}
          />
        );

      case 'coding': {
        const lang = answer.codeLanguage || detectLanguage(question.question);
        return (
          <PYQCodeEditor
            value={answer.codeAnswer || ''}
            onChange={(val) =>
              onAnswer(question.id, {
                codeAnswer: val,
                isAnswered: val.trim().length > 0,
              })
            }
            language={lang}
            onLanguageChange={(newLang) => onAnswer(question.id, { codeLanguage: newLang })}
            disabled={disabled}
          />
        );
      }

      case 'case-based':
        if (question.options && question.options.length > 0) {
          return (
            <PYQOptionList
              options={question.options}
              selectedOption={answer.selectedOption}
              onSelect={(opt) => onAnswer(question.id, { selectedOption: opt, isAnswered: true })}
              disabled={disabled}
              showResult={showResults}
              correctAnswer={autoResult?.correctAnswer}
            />
          );
        }
        return (
          <PYQTextAnswer
            value={answer.textAnswer || ''}
            onChange={(val) =>
              onAnswer(question.id, {
                textAnswer: val,
                isAnswered: val.trim().length > 0,
              })
            }
            disabled={disabled}
            rows={4}
            placeholder="Write your answer for this case-based question..."
          />
        );

      default:
        return (
          <PYQTextAnswer
            value={answer.textAnswer || ''}
            onChange={(val) =>
              onAnswer(question.id, {
                textAnswer: val,
                isAnswered: val.trim().length > 0,
              })
            }
            disabled={disabled}
            rows={4}
          />
        );
    }
  };

  const answeredCount = Object.values(answers).filter((a) => a.isAnswered).length;

  const paperDef = subject ? CBSE_PAPER_STRUCTURE[subject] : null;
  const instructions = subject ? generatePaperInstructions(subject) : [];

  return (
    <div className="space-y-0">
      {/* CBSE paper header — only during taking phase */}
      {!showResults && subject && paperDef && (
        <div className="border border-border rounded-lg p-5 mb-4 space-y-3">
          <div className="text-center space-y-1">
            <p className="text-[11px] font-medium text-text-faint uppercase tracking-widest">
              Central Board of Secondary Education
            </p>
            <p className="text-[13px] font-semibold text-text-primary">
              Sample Question Paper — {subject}
            </p>
            <div className="flex items-center justify-center gap-4 text-[12px] text-text-secondary">
              <span>Maximum Marks: {paperDef.totalMarks}</span>
              <span className="text-border">|</span>
              <span>Time: 3 Hours</span>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-semibold text-text-secondary mb-1.5">
              General Instructions
            </p>
            <ol className="list-[lower-roman] pl-5 space-y-0.5">
              {instructions.map((inst, i) => (
                <li key={i} className="text-[11px] text-text-muted leading-relaxed">
                  {inst}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Sticky section tabs */}
      <div className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm border-b border-border pb-2 pt-1 -mx-4 px-4">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {sections.map((sec) => {
            const counts = sectionAnsweredCounts[sec.section];
            const isActive = activeSection === sec.section;
            return (
              <button
                key={sec.section}
                onClick={() => scrollToSection(sec.section)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium
                           transition-colors duration-100 whitespace-nowrap shrink-0
                           ${isActive
                             ? 'bg-accent text-white'
                             : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                           }`}
              >
                Section {sec.section}
                <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-text-faint'}`}>
                  {counts?.answered}/{counts?.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections with questions */}
      <div className="space-y-8 pt-4">
        {sections.map((sec) => (
          <div
            key={sec.section}
            ref={(el) => { sectionRefs.current[sec.section] = el; }}
            id={`section-${sec.section}`}
          >
            {/* Section header */}
            <div className="mb-4 pb-3 border-b border-border">
              <h2 className="text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                {sec.label}
              </h2>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {sec.questions.map((question) => {
                const answer = answers[question.id] || {
                  questionId: question.id,
                  type: question.type,
                  isAnswered: false,
                  isFlagged: false,
                };
                const autoResult = autoResults[question.id];
                const feedback = aiFeedback[question.id];

                return (
                  <div key={question.id} className="space-y-3">
                    {/* Question header */}
                    <div className="flex items-start gap-3">
                      <span className="text-[13px] font-semibold text-text-primary shrink-0 mt-0.5">
                        Q{question.questionNumber}.
                      </span>
                      <div className="flex-1 space-y-3">
                        {/* Question text + marks badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[13px] text-text-primary leading-relaxed prose-study flex-1">
                            <ReactMarkdown
                              remarkPlugins={REMARK_PLUGINS}
                              rehypePlugins={REHYPE_PLUGINS}
                            >
                              {question.question}
                            </ReactMarkdown>
                          </div>
                          <span className="chip chip-accent shrink-0 mt-0.5">
                            {question.marks}m
                          </span>
                        </div>

                        {/* Answer input */}
                        {renderQuestionInput(question, answer)}

                        {/* Alternative question (OR) */}
                        {question.hasAlternative && question.alternativeQuestion && (
                          <div className="space-y-3 pt-3">
                            <div className="flex items-center gap-3">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-[12px] font-semibold text-text-muted uppercase">OR</span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="text-[13px] text-text-primary leading-relaxed prose-study">
                              <ReactMarkdown
                                remarkPlugins={REMARK_PLUGINS}
                                rehypePlugins={REHYPE_PLUGINS}
                              >
                                {question.alternativeQuestion.question}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}

                        {/* Results section */}
                        {showResults && (
                          <div className="space-y-3 pt-2">
                            {autoResult && (
                              <div className={`text-[12px] font-medium ${autoResult.isCorrect ? 'text-success' : 'text-error'}`}>
                                {autoResult.isCorrect ? 'Correct!' : 'Incorrect'}
                              </div>
                            )}
                            <PYQSolution
                              correctAnswer={question.correctAnswer}
                              solution={question.solution}
                              marks={question.marks}
                            />
                            {feedback && <PYQAIFeedback feedback={feedback} />}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Separator between questions */}
                    <div className="h-px bg-border/50" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit button */}
      {!showResults && (
        <div className="pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] text-text-muted">
              {answeredCount} of {questions.length} questions answered
            </span>
            {answeredCount < questions.length && (
              <span className="text-[11px] text-warning">
                {questions.length - answeredCount} unanswered
              </span>
            )}
          </div>
          <button
            onClick={onSubmit}
            className="btn-primary w-full justify-center"
          >
            <CheckCircle2 size={14} />
            Submit Paper
          </button>
        </div>
      )}
    </div>
  );
}
