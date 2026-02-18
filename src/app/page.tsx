'use client';

import { useState } from 'react';
import Link from 'next/link';
import { subjects } from '@/components/SubjectSelector';
import { Subject } from '@/types';
import {
  GraduationCap,
  BookOpen,
  Brain,
  CreditCard,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'AI Tutor',
    description: 'Learn with Socratic teaching, step-by-step explanations, and visual diagrams',
    href: '/learn',
    color: '#455EB5',
  },
  {
    icon: Brain,
    title: 'Smart Quizzes',
    description: 'CBSE-pattern MCQs, assertion-reasoning, and competency-based questions',
    href: '/quiz',
    color: '#5643CC',
  },
  {
    icon: CreditCard,
    title: 'Flashcards',
    description: 'Generate flip cards from any topic or your own notes for quick revision',
    href: '/flashcards',
    color: '#673FD7',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Track progress, identify weak areas, and get study recommendations',
    href: '/dashboard',
    color: '#7C3AED',
  },
];

export default function HomePage() {
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Physics');

  return (
    <main className="flex-1 min-h-screen">
      <div className="page-glow" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center accent-glow">
              <GraduationCap size={32} className="text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            <span className="text-gradient">StudyBuddy AI</span>
          </h1>
          <p className="text-lg text-text-secondary mb-2">
            Your AI-powered CBSE Class 12 study companion
          </p>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Learn visually, test your knowledge, and track your progress with intelligent AI agents
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {features.map((feature, i) => (
            <Link
              key={feature.title}
              href={feature.href}
              className={`glass-card p-6 group hover:border-border-hover transition-all duration-150
                         animate-fade-in-up stagger-${i + 1}`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${feature.color}20` }}
              >
                <feature.icon size={20} style={{ color: feature.color }} />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1.5 flex items-center gap-2">
                {feature.title}
                <ArrowRight
                  size={14}
                  className="text-text-muted opacity-0 -translate-x-2 group-hover:opacity-100
                             group-hover:translate-x-0 transition-all duration-150"
                />
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
            </Link>
          ))}
        </div>

        {/* Quick start */}
        <div className="text-center animate-fade-in-up stagger-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles size={16} className="text-accent-2" />
            <h2 className="text-sm font-medium text-text-primary">Quick Start</h2>
          </div>
          <p className="text-xs text-text-muted mb-4">Pick a subject and start learning</p>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {subjects.map(subject => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${selectedSubject === subject
                    ? 'accent-gradient text-white accent-glow'
                    : 'bg-bg-surface text-text-muted border border-border hover:border-border-hover hover:text-text-secondary'
                  }`}
              >
                {subject}
              </button>
            ))}
          </div>

          <Link
            href="/learn"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg accent-gradient
                       text-white font-medium hover:accent-glow transition-all"
          >
            Start Learning {selectedSubject}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
