'use client';

import { useState } from 'react';
import Link from 'next/link';
import { subjects } from '@/components/SubjectSelector';
import { Subject } from '@/types';
import {
  BookOpen,
  Brain,
  Layers,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Learn',
    description: 'Socratic tutoring with step-by-step explanations and visual diagrams.',
    href: '/learn',
  },
  {
    icon: Brain,
    title: 'Quiz',
    description: 'CBSE-pattern MCQs, assertion-reasoning, and competency-based questions.',
    href: '/quiz',
  },
  {
    icon: Layers,
    title: 'Flashcards',
    description: 'Generate flip cards from any topic or your notes for quick revision.',
    href: '/flashcards',
  },
  {
    icon: BarChart3,
    title: 'Dashboard',
    description: 'Track progress, find weak areas, and get study recommendations.',
    href: '/dashboard',
  },
];

export default function HomePage() {
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Physics');

  return (
    <main className="flex-1 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <div className="mb-16 animate-fade-in-up">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary mb-3">
            StudyBuddy AI
          </h1>
          <p className="text-[15px] text-text-secondary leading-relaxed max-w-md">
            AI-powered study companion for CBSE Class 12. Learn concepts, take quizzes, and track your progress.
          </p>
        </div>

        {/* Feature cards */}
        <div className="space-y-1 mb-16">
          {features.map((feature, i) => (
            <Link
              key={feature.title}
              href={feature.href}
              className={`flex items-center gap-4 px-4 py-3.5 -mx-4 rounded-lg
                         text-text-secondary hover:text-text-primary hover:bg-bg-surface
                         transition-colors duration-100 group
                         animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="w-8 h-8 rounded-md bg-bg-elevated border border-border flex items-center justify-center shrink-0">
                <feature.icon size={16} className="text-text-muted group-hover:text-text-primary transition-colors" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-text-primary mb-0.5">{feature.title}</div>
                <div className="text-[12px] text-text-muted leading-relaxed">{feature.description}</div>
              </div>
              <ArrowRight
                size={14}
                className="text-text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              />
            </Link>
          ))}
        </div>

        {/* Subject selector */}
        <div className="animate-fade-in-up stagger-5">
          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-3">Quick Start</p>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {subjects.map(subject => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-100
                  ${selectedSubject === subject
                    ? 'bg-accent text-white'
                    : 'bg-bg-surface text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                  }`}
              >
                {subject}
              </button>
            ))}
          </div>

          <Link
            href="/learn"
            className="btn-primary inline-flex items-center gap-2"
          >
            Start learning {selectedSubject}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}
