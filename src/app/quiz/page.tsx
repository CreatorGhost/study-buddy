'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import SubjectSelector from '@/components/SubjectSelector';
import QuizCard from '@/components/QuizCard';
import QuizResults from '@/components/QuizResults';
import { Subject, QuizQuestion, QuizConfig, Difficulty, QuestionType } from '@/types';
import { saveQuizResult } from '@/lib/storage';
import { Brain, ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react';

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

  const generateQuiz = async () => {
    if (!topic.trim()) return;
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
      alert('Failed to generate quiz. Please try again.');
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
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Quiz</h1>
            <p className="text-xs text-text-muted">Test your knowledge</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Setup Phase */}
          {phase === 'setup' && (
            <div className="max-w-lg mx-auto space-y-6 animate-fade-in-up">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-4 accent-glow">
                  <Brain size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-semibold text-text-primary">Create a Quiz</h2>
                <p className="text-sm text-text-muted mt-1">Configure your assessment</p>
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Subject</label>
                <SubjectSelector value={subject} onChange={setSubject} variant="chips" />
              </div>

              {/* Topic */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g., Electromagnetic Induction, Organic Chemistry..."
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm
                             text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-2"
                />
              </div>

              {/* Number of questions */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  Questions: {numQuestions}
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15].map(n => (
                    <button
                      key={n}
                      onClick={() => setNumQuestions(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                        ${numQuestions === n
                          ? 'accent-gradient text-white'
                          : 'bg-bg-elevated border border-border text-text-muted hover:text-text-secondary'
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all
                        ${difficulty === d
                          ? 'accent-gradient text-white'
                          : 'bg-bg-elevated border border-border text-text-muted hover:text-text-secondary'
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Type */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Question Type</label>
                <div className="flex gap-2">
                  {([
                    { value: 'mcq', label: 'MCQ' },
                    { value: 'assertion-reasoning', label: 'Assert-Reason' },
                    { value: 'mixed', label: 'Mixed' },
                  ] as { value: QuestionType; label: string }[]).map(t => (
                    <button
                      key={t.value}
                      onClick={() => setQuestionType(t.value)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                        ${questionType === t.value
                          ? 'accent-gradient text-white'
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg accent-gradient
                           text-white font-medium hover:accent-glow transition-all disabled:opacity-40"
              >
                <Play size={18} />
                Start Quiz
              </button>
            </div>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <Loader2 size={40} className="text-accent-2 animate-spin mb-4" />
              <p className="text-sm text-text-muted">Generating your quiz...</p>
            </div>
          )}

          {/* Taking Quiz */}
          {phase === 'taking' && questions.length > 0 && (
            <div className="max-w-2xl mx-auto">
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-muted">Progress</span>
                  <span className="text-xs text-text-muted">
                    {Object.keys(answers).length}/{questions.length} answered
                  </span>
                </div>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full accent-gradient transition-all duration-300"
                    style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <QuizCard
                question={questions[currentIndex]}
                index={currentIndex}
                total={questions.length}
                selectedAnswer={answers[questions[currentIndex].id]}
                onAnswer={handleAnswer}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-muted
                             hover:text-text-primary disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <div className="flex gap-1.5">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-7 h-7 rounded-md text-xs font-medium transition-all
                        ${i === currentIndex
                          ? 'accent-gradient text-white'
                          : answers[q.id]
                          ? 'bg-accent-2/20 text-accent-2'
                          : 'bg-bg-elevated text-text-muted'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-muted
                               hover:text-text-primary transition-all"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(answers).length < questions.length}
                    className="px-4 py-2 rounded-lg accent-gradient text-sm font-medium text-white
                               hover:accent-glow transition-all disabled:opacity-40"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'results' && showResult && (
            <div className="max-w-2xl mx-auto space-y-6">
              <QuizResults
                questions={questions}
                answers={answers}
                onRetryWrong={retryWrong}
                onNewQuiz={newQuiz}
              />

              {/* Individual question review */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-muted">Review Answers</h3>
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
