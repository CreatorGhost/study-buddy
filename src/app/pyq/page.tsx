'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import PYQSetup from '@/components/pyq/PYQSetup';
import PYQQuestionCard from '@/components/pyq/PYQQuestionCard';
import PYQNavStrip from '@/components/pyq/PYQNavStrip';
import PYQResults from '@/components/pyq/PYQResults';
import {
  Subject,
  PYQQuestion,
  PYQSessionConfig,
  PYQAnswer,
  PYQAIFeedback,
} from '@/types';
import {
  shuffle,
  isAutoCheckable,
  isFillBlank,
  fuzzyMatch,
  calculateTopicBreakdown,
  identifyWeakTopics,
  calculateTotalScore,
  detectLanguage,
} from '@/lib/pyq-utils';
import { savePYQSession } from '@/lib/storage';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';

type Phase = 'setup' | 'taking' | 'reviewing' | 'results';

export default function PYQPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<PYQSessionConfig | null>(null);
  const [questions, setQuestions] = useState<PYQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PYQAnswer>>({});
  const [autoResults, setAutoResults] = useState<
    Record<string, { isCorrect: boolean; correctAnswer: string }>
  >({});
  const [aiFeedback, setAiFeedback] = useState<Record<string, PYQAIFeedback>>(
    {},
  );
  const [reviewProgress, setReviewProgress] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch questions and start session
  const handleStart = useCallback(async (sessionConfig: PYQSessionConfig) => {
    setConfig(sessionConfig);
    setSetupLoading(true);
    setSetupError(null);

    try {
      if (sessionConfig.mode === 'pyq') {
        // Fetch from database
        const params = new URLSearchParams({
          subject: sessionConfig.subject,
          limit: '200',
        });

        const res = await fetch(`/api/pyq?${params}`);
        if (!res.ok) throw new Error('Failed to fetch questions');
        const data = await res.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rawQuestions = data.questions || [];

        // Apply year filter on raw data before mapping
        if (sessionConfig.years.length > 0) {
          const yearSet = new Set(sessionConfig.years);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rawQuestions = rawQuestions.filter((q: any) => yearSet.has(q.year));
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let filtered = rawQuestions.map((q: any) => ({
          id: q.id,
          questionNumber: q.question_number,
          section: q.section || '',
          type: q.type || 'short-answer',
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer || '',
          solution: q.solution || '',
          marks: q.marks,
          topic: q.topic,
        })) as PYQQuestion[];

        // Apply marks filter
        if (sessionConfig.marks.length > 0) {
          const marksSet = new Set(sessionConfig.marks);
          filtered = filtered.filter((q) => marksSet.has(q.marks));
        }

        // Shuffle and limit
        const selected = shuffle(filtered).slice(
          0,
          sessionConfig.questionCount,
        );

        if (selected.length === 0) {
          setSetupError('No questions found for the selected filters. Try broadening your selection.');
          setSetupLoading(false);
          return;
        }

        // Initialize answers
        const initialAnswers: Record<string, PYQAnswer> = {};
        for (const q of selected) {
          initialAnswers[q.id] = {
            questionId: q.id,
            type: q.type,
            isAnswered: false,
            isFlagged: false,
          };
        }

        setQuestions(selected);
        setAnswers(initialAnswers);
        setAutoResults({});
        setAiFeedback({});
        setCurrentIndex(0);
        setPhase('taking');
      } else {
        // AI generation mode — confirm before calling
        if (
          !confirm(
            `This will use AI to generate ${sessionConfig.questionCount} questions. This costs API credits. Continue?`,
          )
        ) {
          setSetupLoading(false);
          return;
        }

        const res = await fetch('/api/pyq/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: sessionConfig.subject,
            marks: sessionConfig.marks[0] || 2,
            count: sessionConfig.questionCount,
          }),
        });

        if (!res.ok) throw new Error('Failed to generate questions');
        const data = await res.json();
        const generated = data.questions as PYQQuestion[];

        const initialAnswers: Record<string, PYQAnswer> = {};
        for (const q of generated) {
          initialAnswers[q.id] = {
            questionId: q.id,
            type: q.type,
            isAnswered: false,
            isFlagged: false,
          };
        }

        setQuestions(generated);
        setAnswers(initialAnswers);
        setAutoResults({});
        setAiFeedback({});
        setCurrentIndex(0);
        setPhase('taking');
      }
    } catch (err) {
      console.error('Failed to start session:', err);
      setSetupError('Failed to load questions. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  }, []);

  // Update a single answer
  const handleAnswer = useCallback(
    (questionId: string, update: Partial<PYQAnswer>) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], ...update },
      }));
    },
    [],
  );

  // Toggle flag on a question
  const handleToggleFlag = useCallback((questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isFlagged: !prev[questionId].isFlagged,
      },
    }));
  }, []);

  // Submit and check all answers
  const handleSubmit = useCallback(async () => {
    setPhase('reviewing');

    // Step 1: Auto-check objective questions
    setReviewProgress('Checking objective answers...');
    const newAutoResults: Record<
      string,
      { isCorrect: boolean; correctAnswer: string }
    > = {};

    for (const q of questions) {
      const answer = answers[q.id];
      if (!answer?.isAnswered) continue;

      if (isAutoCheckable(q.type)) {
        const studentAnswer = answer.selectedOption || '';
        newAutoResults[q.id] = {
          isCorrect:
            studentAnswer.toUpperCase() === q.correctAnswer.toUpperCase(),
          correctAnswer: q.correctAnswer,
        };
      } else if (isFillBlank(q.type)) {
        const studentAnswer = answer.textAnswer || '';
        const isCorrect = fuzzyMatch(studentAnswer, q.correctAnswer);
        newAutoResults[q.id] = {
          isCorrect,
          correctAnswer: q.correctAnswer,
        };
      }
    }

    setAutoResults(newAutoResults);

    // Step 2: Collect subjective questions needing AI check
    const subjectiveQuestions = questions.filter((q) => {
      const answer = answers[q.id];
      if (!answer?.isAnswered) return false;
      if (isAutoCheckable(q.type)) return false;
      if (isFillBlank(q.type) && newAutoResults[q.id]) return false;
      return true;
    });

    // Step 3: Batch AI check
    if (subjectiveQuestions.length > 0 && config) {
      setReviewProgress(
        `Evaluating ${subjectiveQuestions.length} subjective answer${subjectiveQuestions.length > 1 ? 's' : ''} with AI...`,
      );

      try {
        const checkPayload = subjectiveQuestions.map((q) => {
          const answer = answers[q.id];
          return {
            id: q.id,
            question: q.question,
            studentAnswer:
              answer.codeAnswer || answer.textAnswer || '[No answer provided]',
            correctAnswer: q.correctAnswer,
            solution: q.solution,
            type: q.type,
            marks: q.marks,
            imageBase64: answer.imageBase64,
            codeLanguage:
              q.type === 'coding'
                ? answer.codeLanguage || detectLanguage(q.question)
                : undefined,
          };
        });

        const res = await fetch('/api/pyq/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: config.subject,
            questions: checkPayload,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const newAiFeedback: Record<string, PYQAIFeedback> = {};
          for (const result of data.results || []) {
            newAiFeedback[result.questionId] = {
              questionId: result.questionId,
              score: result.score,
              maxMarks: result.maxMarks,
              feedback: result.feedback,
              keyPointsMissed: result.keyPointsMissed || [],
              isCorrect: result.isCorrect,
            };
          }
          setAiFeedback(newAiFeedback);
        } else {
          console.error('AI check HTTP error:', res.status);
          setAiError('AI evaluation returned an error. Scores for subjective questions may be incomplete.');
        }
      } catch (err) {
        console.error('AI check failed:', err);
        setAiError('AI evaluation was unavailable. Scores for subjective questions may be incomplete.');
      }
    }

    // Step 4: Move to results
    setReviewProgress('Calculating results...');
    setPhase('results');
  }, [questions, answers, config]);

  const { totalScore, maxScore } = useMemo(
    () => phase === 'results'
      ? calculateTotalScore(questions, autoResults, aiFeedback)
      : { totalScore: 0, maxScore: 0 },
    [phase, questions, autoResults, aiFeedback],
  );
  const topicBreakdown = useMemo(
    () => phase === 'results'
      ? calculateTopicBreakdown(questions, answers, autoResults, aiFeedback)
      : {},
    [phase, questions, answers, autoResults, aiFeedback],
  );
  const weakTopics = useMemo(
    () => phase === 'results' ? identifyWeakTopics(topicBreakdown) : [],
    [phase, topicBreakdown],
  );

  // Save session once when results phase is entered (after all checking is done)
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (phase === 'results' && !hasSavedRef.current && config && questions.length > 0) {
      hasSavedRef.current = true;
      savePYQSession({
        id: `pyq_${Date.now()}`,
        subject: config.subject,
        mode: config.mode,
        years: config.years,
        marks: config.marks,
        questions,
        answers,
        autoResults,
        aiFeedback,
        totalScore,
        maxScore,
        topicBreakdown,
        weakTopics,
        createdAt: Date.now(),
      });
    }
    if (phase !== 'results') {
      hasSavedRef.current = false;
    }
  }, [phase, config, questions, answers, autoResults, aiFeedback, totalScore, maxScore, topicBreakdown, weakTopics]);

  // Scroll to top on question change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex]);

  // Scroll to top on phase change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
  }, [phase]);

  // Keyboard navigation in taking phase
  useEffect(() => {
    if (phase !== 'taking') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, questions.length]);

  // Retry wrong questions
  const handleRetryWrong = useCallback(() => {
    const wrongQuestions = questions.filter((q) => {
      if (autoResults[q.id]) return !autoResults[q.id].isCorrect;
      if (aiFeedback[q.id]) return !aiFeedback[q.id].isCorrect;
      return true; // Unanswered = wrong
    });

    const initialAnswers: Record<string, PYQAnswer> = {};
    for (const q of wrongQuestions) {
      initialAnswers[q.id] = {
        questionId: q.id,
        type: q.type,
        isAnswered: false,
        isFlagged: false,
      };
    }

    setQuestions(wrongQuestions);
    setAnswers(initialAnswers);
    setAutoResults({});
    setAiFeedback({});
    setCurrentIndex(0);
    setPhase('taking');
  }, [questions, autoResults, aiFeedback]);

  // New session
  const handleNewSession = useCallback(() => {
    setPhase('setup');
    setQuestions([]);
    setAnswers({});
    setAutoResults({});
    setAiFeedback({});
    setAiError(null);
    setConfig(null);
  }, []);

  const handlePracticeWeakTopics = useCallback(() => {
    handleNewSession();
  }, [handleNewSession]);

  const answeredCount = Object.values(answers).filter(
    (a) => a.isAnswered,
  ).length;
  const currentQuestion = questions[currentIndex];

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex items-center justify-between pl-14 md:pl-4 pr-4 h-12 border-b border-border shrink-0">
          <h1 className="text-[13px] font-semibold text-text-primary">
            PYQ Practice
          </h1>
          {phase === 'taking' && (
            <span className="text-[11px] text-text-muted">
              {config?.subject} &middot; {answeredCount}/{questions.length}{' '}
              answered
            </span>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          {/* Setup Phase */}
          {phase === 'setup' && (
            <div className="max-w-md mx-auto space-y-5 animate-fade-in-up">
              <div className="mb-6">
                <h2 className="text-[15px] font-medium text-text-primary mb-1">
                  Previous Year Questions
                </h2>
                <p className="text-[12px] text-text-muted">
                  Practice with real CBSE board exam questions
                </p>
              </div>
              {setupError && (
                <div className="bg-error/10 border border-error/30 rounded-md px-4 py-3 text-[12px] text-error">
                  {setupError}
                </div>
              )}
              <PYQSetup onStart={handleStart} loading={setupLoading} />
            </div>
          )}

          {/* Taking Phase */}
          {phase === 'taking' && currentQuestion && (
            <div className="max-w-xl mx-auto space-y-5">
              {/* Progress bar */}
              <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{
                    width: `${(answeredCount / questions.length) * 100}%`,
                  }}
                />
              </div>

              {/* Question card */}
              <PYQQuestionCard
                question={currentQuestion}
                index={currentIndex}
                total={questions.length}
                answer={
                  answers[currentQuestion.id] || {
                    questionId: currentQuestion.id,
                    type: currentQuestion.type,
                    isAnswered: false,
                    isFlagged: false,
                  }
                }
                onAnswer={(update) =>
                  handleAnswer(currentQuestion.id, update)
                }
                onToggleFlag={() => handleToggleFlag(currentQuestion.id)}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() =>
                    setCurrentIndex(Math.max(0, currentIndex - 1))
                  }
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] text-text-muted
                             hover:text-text-primary disabled:opacity-25 transition-colors shrink-0"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                <PYQNavStrip
                  currentIndex={currentIndex}
                  answers={answers}
                  questionIds={questions.map((q) => q.id)}
                  onNavigate={setCurrentIndex}
                />

                <div className="shrink-0 min-w-[80px] flex justify-end">
                  {currentIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIndex(currentIndex + 1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] text-text-muted
                                 hover:text-text-primary transition-colors"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      className="btn-primary whitespace-nowrap text-[12px]"
                    >
                      <CheckCircle2 size={14} />
                      Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reviewing Phase */}
          {phase === 'reviewing' && (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <Loader2
                size={24}
                className="text-accent animate-spin mb-3"
              />
              <p className="text-[13px] text-text-muted">{reviewProgress}</p>
              <p className="text-[11px] text-text-faint mt-2 animate-pulse">
                This may take a moment...
              </p>
            </div>
          )}

          {/* Results Phase */}
          {phase === 'results' && (
            <div className="max-w-xl mx-auto space-y-5">
              {aiError && (
                <div className="bg-warning/10 border border-warning/30 rounded-md px-4 py-3 text-[12px] text-warning">
                  {aiError}
                </div>
              )}
              <PYQResults
                totalScore={totalScore}
                maxScore={maxScore}
                topicBreakdown={topicBreakdown}
                weakTopics={weakTopics}
                onRetryWrong={handleRetryWrong}
                onNewSession={handleNewSession}
                onPracticeWeakTopics={handlePracticeWeakTopics}
              />

              {/* Review all questions */}
              <div className="space-y-3">
                <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
                  Review
                </h3>
                {questions.map((q, i) => (
                  <PYQQuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    total={questions.length}
                    answer={
                      answers[q.id] || {
                        questionId: q.id,
                        type: q.type,
                        isAnswered: false,
                        isFlagged: false,
                      }
                    }
                    onAnswer={() => {}}
                    onToggleFlag={() => {}}
                    showResult
                    autoResult={autoResults[q.id]}
                    aiFeedback={aiFeedback[q.id]}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
