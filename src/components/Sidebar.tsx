'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Brain,
  CreditCard,
  LayoutDashboard,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/quiz', label: 'Quiz', icon: Brain },
  { href: '/flashcards', label: 'Flashcards', icon: CreditCard },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-bg-surface border border-border"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen w-[240px] z-50
          bg-bg-surface/80 backdrop-blur-xl border-r border-border
          flex flex-col transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 md:hidden p-1 rounded-lg hover:bg-bg-elevated"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 px-5 py-6">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary">StudyBuddy</h1>
            <p className="text-[10px] text-text-muted">CBSE Class 12</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-150 group relative
                  ${isActive
                    ? 'bg-accent-2/10 text-text-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full accent-gradient" />
                )}
                <item.icon size={18} className={isActive ? 'text-accent-2' : ''} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[11px] text-text-muted">Powered by Claude AI</p>
        </div>
      </aside>
    </>
  );
}
