'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Brain,
  Layers,
  BarChart3,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/quiz', label: 'Quiz', icon: Brain },
  { href: '/flashcards', label: 'Flashcards', icon: Layers },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-md bg-bg-surface border border-border text-text-secondary"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen w-[220px] z-50
          bg-bg-surface border-r border-border
          flex flex-col transition-transform duration-150 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Close mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 md:hidden p-1 rounded-md hover:bg-bg-hover text-text-muted"
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
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px]
                  transition-colors duration-100
                  ${isActive
                    ? 'bg-bg-hover text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }
                `}
              >
                <item.icon size={16} className={isActive ? 'text-text-primary' : 'text-text-muted'} strokeWidth={1.75} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-text-faint">Powered by Claude</p>
        </div>
      </aside>
    </>
  );
}
