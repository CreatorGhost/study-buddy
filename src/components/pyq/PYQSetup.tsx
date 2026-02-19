'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Sparkles, TrendingDown } from 'lucide-react';
import SubjectSelector from '@/components/SubjectSelector';
import { getMarksForSubject } from '@/lib/pyq-utils';
import { getTopWeakTopics } from '@/lib/storage';
import type { Subject, PYQSessionConfig, PYQPracticeMode, WeakTopic } from '@/types';

interface PYQSetupProps {
  onStart: (config: PYQSessionConfig) => void;
  loading?: boolean;
}

interface SubjectIndexData {
  name: string;
  years: number[];
  markCounts: Record<number, number>;
  totalQuestions: number;
}

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];

export default function PYQSetup({ onStart, loading = false }: PYQSetupProps) {
  const [subject, setSubject] = useState<Subject>('Physics');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [allYears, setAllYears] = useState(true);
  const [selectedMarks, setSelectedMarks] = useState<number[]>([]);
  const [allMarks, setAllMarks] = useState(true);
  const [questionCount, setQuestionCount] = useState(10);
  const [mode, setMode] = useState<PYQPracticeMode>('pyq');
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);

  // Index data from API
  const [indexData, setIndexData] = useState<SubjectIndexData[]>([]);
  const [indexLoading, setIndexLoading] = useState(true);

  // Fetch index on mount
  useEffect(() => {
    const fetchIndex = async () => {
      setIndexLoading(true);
      try {
        const res = await fetch('/api/pyq');
        if (!res.ok) throw new Error('Failed to fetch index');
        const data = await res.json();
        setIndexData(data.subjects || []);
      } catch {
        // Silently handle — UI will show empty state
      } finally {
        setIndexLoading(false);
      }
    };
    fetchIndex();
  }, []);

  // Update weak topics when subject changes
  useEffect(() => {
    setWeakTopics(getTopWeakTopics(subject));
  }, [subject]);

  // Reset selections when subject changes
  useEffect(() => {
    setSelectedYears([]);
    setAllYears(true);
    setSelectedMarks([]);
    setAllMarks(true);
  }, [subject]);

  const subjectData = indexData.find((s) => s.name === subject);
  const availableYears = subjectData?.years || [];
  const availableMarks = getMarksForSubject(subject);

  const toggleYear = (year: number) => {
    setAllYears(false);
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const toggleAllYears = () => {
    if (allYears) {
      setAllYears(false);
      setSelectedYears([]);
    } else {
      setAllYears(true);
      setSelectedYears(availableYears);
    }
  };

  const toggleMark = (mark: number) => {
    setAllMarks(false);
    setSelectedMarks((prev) =>
      prev.includes(mark) ? prev.filter((m) => m !== mark) : [...prev, mark]
    );
  };

  const toggleAllMarks = () => {
    if (allMarks) {
      setAllMarks(false);
      setSelectedMarks([]);
    } else {
      setAllMarks(true);
      setSelectedMarks(availableMarks);
    }
  };

  const handlePracticeWeakTopics = () => {
    // Call onStart directly with all filters open — don't rely on batched setState
    onStart({
      subject,
      years: availableYears,
      marks: availableMarks,
      questionCount,
      mode,
    });
  };

  const handleStart = () => {
    const years = allYears ? availableYears : selectedYears;
    const marks = allMarks ? availableMarks : selectedMarks;

    if (years.length === 0 || marks.length === 0) return;

    onStart({
      subject,
      years,
      marks,
      questionCount,
      mode,
    });
  };

  const canStart =
    !loading &&
    !indexLoading &&
    (allYears || selectedYears.length > 0) &&
    (allMarks || selectedMarks.length > 0);

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 animate-fade-in-up space-y-5">
      {/* Subject */}
      <div>
        <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-2 block">
          Subject
        </label>
        <SubjectSelector value={subject} onChange={setSubject} variant="chips" />
      </div>

      {indexLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-[12px] text-text-muted animate-pulse">Loading question bank...</div>
        </div>
      ) : (
        <>
          {/* Years */}
          <div>
            <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-2 block">
              Years
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={toggleAllYears}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
                  ${allYears
                    ? 'bg-accent text-white'
                    : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                  }`}
              >
                All Years
              </button>
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
                    ${allYears || selectedYears.includes(year)
                      ? 'bg-accent text-white'
                      : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Marks */}
          <div>
            <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-2 block">
              Marks
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={toggleAllMarks}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
                  ${allMarks
                    ? 'bg-accent text-white'
                    : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                  }`}
              >
                All
              </button>
              {availableMarks.map((mark) => (
                <button
                  key={mark}
                  onClick={() => toggleMark(mark)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
                    ${allMarks || selectedMarks.includes(mark)
                      ? 'bg-accent text-white'
                      : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                    }`}
                >
                  {mark} mark{mark !== 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div>
            <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-2 block">
              Questions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
                    ${questionCount === count
                      ? 'bg-accent text-white'
                      : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                    }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Toggle */}
          <div>
            <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-2 block">
              Mode
            </label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setMode('pyq')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
                  ${mode === 'pyq'
                    ? 'bg-accent text-white'
                    : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                  }`}
              >
                Practice PYQ
              </button>
              <button
                onClick={() => setMode('ai-similar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
                  ${mode === 'ai-similar'
                    ? 'bg-accent text-white'
                    : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                  }`}
              >
                <Sparkles size={12} />
                AI Similar
              </button>
            </div>
            {mode === 'ai-similar' && (
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-md bg-warning-subtle border border-warning/20">
                <AlertTriangle size={12} className="text-warning shrink-0" />
                <span className="text-[11px] text-warning">
                  AI-generated questions use API credits
                </span>
              </div>
            )}
          </div>

          {/* Weak Topics Card */}
          {weakTopics.length > 0 && (
            <div className="bg-bg-elevated border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <TrendingDown size={13} className="text-error" />
                <span className="text-[12px] font-medium text-text-secondary">
                  Weak Topics in {subject}
                </span>
              </div>
              <div className="space-y-1.5">
                {weakTopics.map((wt) => (
                  <div key={wt.topic} className="flex items-center justify-between">
                    <span className="text-[12px] text-text-muted">{wt.topic}</span>
                    <span className="text-[11px] text-error font-medium">
                      {Math.round(wt.accuracy * 100)}%
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handlePracticeWeakTopics}
                disabled={loading}
                className="btn-ghost w-full text-[12px] justify-center"
              >
                <TrendingDown size={12} />
                Practice Weak Topics
              </button>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="btn-primary w-full justify-center"
          >
            {loading ? 'Loading questions...' : 'Start Practice'}
          </button>
        </>
      )}
    </div>
  );
}
