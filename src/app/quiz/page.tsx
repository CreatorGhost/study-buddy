'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import SubjectSelector from '@/components/SubjectSelector';
import QuizCard from '@/components/QuizCard';
import QuizResults from '@/components/QuizResults';
import { Subject, QuizQuestion, QuizConfig, Difficulty, QuestionType } from '@/types';
import { saveQuizResult } from '@/lib/storage';
import { ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react';

type Phase = 'setup' | 'loading' | 'taking' | 'results';

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [subject, setSubject] = useState<Subject>('Physics');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionType, setQuestionType] = useState<QuestionType>('mixed');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setError(null);
    setPhase('loading');

    try {
      const config: QuizConfig = { subject, topic, numQuestions, difficulty, questionType };
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_quiz', config }),
      });

      if (!res.ok) throw new Error('Failed to generate quiz');
      const data = await res.json();
      setQuestions(data.questions);
      setAnswers({});
      setCurrentIndex(0);
      setShowResult(false);
      setPhase('taking');
    } catch {
      setPhase('setup');
      setError('Failed to generate quiz. Please try again.');
    }
  };

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: answer }));
  };

  const submitQuiz = () => {
    setShowResult(true);
    setPhase('results');

    const score = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    saveQuizResult({
      id: `quiz_${Date.now()}`,
      subject,
      topic,
      questions,
      answers,
      score,
      total: questions.length,
      date: Date.now(),
    });
  };

  const retryWrong = () => {
    const wrongQuestions = questions.filter(q => answers[q.id] !== q.correctAnswer);
    setQuestions(wrongQuestions);
    setAnswers({});
    setCurrentIndex(0);
    setShowResult(false);
    setPhase('taking');
  };

  const newQuiz = () => {
    setPhase('setup');
    setQuestions([]);
    setAnswers({});
    setTopic('');
  };

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex items-center pl-14 md:pl-4 pr-4 h-12 border-b border-border shrink-0">
          <h1 className="text-[13px] font-semibold text-text-primary">Quiz</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* Setup */}
          {phase === 'setup' && (
            <div className="max-w-md mx-auto space-y-5 animate-fade-in-up">
              <div className="mb-6">
                <h2 className="text-[15px] font-medium text-text-primary mb-1">Create a Quiz</h2>
                <p className="text-[12px] text-text-muted">Configure your assessment</p>
              </div>

              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-2 block">Subject</label>
                <SubjectSelector value={subject} onChange={setSubject} variant="chips" />
              </div>

              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-2 block">Topic</label>
                <input
                  type="text"
                  autoFocus
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && topic.trim()) generateQuiz(); }}
                  placeholder="e.g., Electromagnetic Induction, Organic Chemistry..."
                  className="input-base"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-2 block">
                  Questions: {numQuestions}
                </label>
                <div className="flex gap-1.5">
                  {[5, 10, 15].map(n => (
                    <button
                      key={n}
                      onClick={() => setNumQuestions(n)}
                      className={`flex-1 py-2 rounded-md text-[12px] font-medium transition-colors duration-100
                        ${numQuestions === n
                          ? 'bg-accent text-white'
                          : 'bg-bg-elevated border border-border text-text-muted hover:text-text-secondary'
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-2 block">Difficulty</label>
                <div className="flex gap-1.5">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-md text-[12px] font-medium capitalize transition-colors duration-100
                        ${difficulty === d
                          ? 'bg-accent text-white'
                          : 'bg-bg-elevated border border-border text-text-muted hover:text-text-secondary'
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-2 block">Type</label>
                <div className="flex gap-1.5">
                  {([
                    { value: 'mcq', label: 'MCQ' },
                    { value: 'assertion-reasoning', label: 'Assert-Reason' },
                    { value: 'mixed', label: 'Mixed' },
                  ] as { value: QuestionType; label: string }[]).map(t => (
                    <button
                      key={t.value}
                      onClick={() => setQuestionType(t.value)}
                      className={`flex-1 py-2 rounded-md text-[12px] font-medium transition-colors duration-100
                        ${questionType === t.value
                          ? 'bg-accent text-white'
                          : 'bg-bg-elevated border border-border text-text-muted hover:text-text-secondary'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateQuiz}
                disabled={!topic.trim()}
                className="btn-primary w-full justify-center py-2.5"
              >
                <Play size={14} />
                Start Quiz
              </button>
              {error && (
                <p className="text-[12px] text-error text-center mt-2">{error}</p>
              )}
            </div>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <Loader2 size={24} className="text-accent animate-spin mb-3" />
              <p className="text-[13px] text-text-muted">Generating your quiz...</p>
            </div>
          )}

          {/* Taking */}
          {phase === 'taking' && questions.length > 0 && (
            <div className="max-w-xl mx-auto">
              {/* Progress */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-text-muted">Progress</span>
                  <span className="text-[11px] text-text-muted">
                    {Object.keys(answers).length}/{questions.length}
                  </span>
                </div>
                <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <QuizCard
                key={questions[currentIndex].id}
                question={questions[currentIndex]}
                index={currentIndex}
                total={questions.length}
                selectedAnswer={answers[questions[currentIndex].id]}
                onAnswer={handleAnswer}
              />

              {/* Nav */}
              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] text-text-muted
                             hover:text-text-primary disabled:opacity-25 transition-colors"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                <div className="flex flex-wrap justify-center gap-1">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-6 h-6 rounded text-[11px] font-medium transition-colors
                        ${i === currentIndex
                          ? 'bg-accent text-white'
                          : answers[q.id]
                          ? 'bg-accent-subtle text-accent-light'
                          : 'bg-bg-elevated text-text-faint'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

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
                  <div className="relative">
                    <button
                      onClick={submitQuiz}
                      disabled={Object.keys(answers).length < questions.length}
                      className="btn-primary"
                    >
                      Submit
                    </button>
                    {Object.keys(answers).length < questions.length && (
                      <span className="absolute -top-6 right-0 text-[10px] text-text-muted whitespace-nowrap">
                        {questions.length - Object.keys(answers).length} unanswered
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'results' && showResult && (
            <div className="max-w-xl mx-auto space-y-5">
              <QuizResults
                questions={questions}
                answers={answers}
                onRetryWrong={retryWrong}
                onNewQuiz={newQuiz}
              />
              <div className="space-y-3">
                <h3 className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Review</h3>
                {questions.map((q, i) => (
                  <QuizCard
                    key={q.id}
                    question={q}
                    index={i}
                    total={questions.length}
                    selectedAnswer={answers[q.id]}
                    onAnswer={() => {}}
                    showResult
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
