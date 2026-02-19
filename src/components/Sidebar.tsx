'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Brain,
  ClipboardList,
  Layers,
  BarChart3,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/quiz', label: 'Quiz', icon: Brain },
  { href: '/pyq', label: 'PYQ Practice', icon: ClipboardList },
  { href: '/flashcards', label: 'Flashcards', icon: Layers },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Escape key to close mobile sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className={`fixed top-2.5 left-3 z-30 md:hidden p-2.5 rounded-md bg-bg-surface/80 backdrop-blur-sm border border-border text-text-secondary
          transition-opacity duration-200
          ${mobileOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        <Menu size={16} />
      </button>

      {/* Mobile overlay */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 md:hidden
          transition-opacity duration-200 ease-out
          ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        aria-label="Main navigation"
        className={`
          fixed md:sticky top-0 left-0 h-screen w-[220px] z-50
          bg-bg-surface border-r border-border
          flex flex-col transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Close mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="absolute top-3 right-3 md:hidden p-2.5 rounded-md hover:bg-bg-hover text-text-muted"
        >
          <X size={16} />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-4 h-12 border-b border-border shrink-0">
          <div className="w-6 h-6 rounded-md accent-gradient flex items-center justify-center">
            <GraduationCap size={14} className="text-white" />
          </div>
          <span className="text-[13px] font-semibold text-text-primary tracking-tight">StudyBuddy</span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setTimeout(() => setMobileOpen(false), 150)}
                className={`
                  flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px]
                  transition-colors duration-100 relative
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent
                  ${isActive
                    ? 'bg-accent-subtle text-text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-4 before:rounded-full before:bg-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }
                `}
              >
                <item.icon size={16} className={isActive ? 'text-accent-light' : 'text-text-muted'} strokeWidth={1.75} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-text-muted">Powered by Claude</p>
        </div>
      </aside>
    </>
  );
}
