'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import SubjectSelector from '@/components/SubjectSelector';
import Flashcard from '@/components/Flashcard';
import { Subject, FlashcardData, FlashcardDeck } from '@/types';
import { getFlashcardDecks, saveFlashcardDeck, deleteFlashcardDeck } from '@/lib/storage';
import { Layers, Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

type Phase = 'home' | 'generate' | 'loading' | 'review';

export default function FlashcardsPage() {
  const [phase, setPhase] = useState<Phase>('home');
  const [subject, setSubject] = useState<Subject>('Physics');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDecks(getFlashcardDecks());
  }, []);

  // Keyboard shortcuts for flashcard navigation
  useEffect(() => {
    if (phase !== 'review' || !activeDeck) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentCardIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentCardIndex(prev => Math.min(activeDeck.cards.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, activeDeck]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setError(null);
    setPhase('loading');

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_flashcards',
          topic,
          subject,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate flashcards');
      const data = await res.json();

      const deck: FlashcardDeck = {
        id: `deck_${Date.now()}`,
        subject,
        topic,
        cards: data.cards,
        createdAt: Date.now(),
      };

      saveFlashcardDeck(deck);
      setDecks(getFlashcardDecks());
      setActiveDeck(deck);
      setCurrentCardIndex(0);
      setPhase('review');
    } catch {
      setPhase('generate');
      setError('Failed to generate flashcards. Please try again.');
    }
  };

  const handleMark = (cardId: string, status: 'got-it' | 'review') => {
    if (!activeDeck) return;

    const updatedCards = activeDeck.cards.map(c =>
      c.id === cardId
        ? {
            ...c,
            status,
            interval: status === 'got-it' ? c.interval * 2 : 1,
            nextReview: status === 'got-it'
              ? Date.now() + c.interval * 2 * 86400000
              : Date.now() + 86400000,
          }
        : c
    );

    const updatedDeck = { ...activeDeck, cards: updatedCards };
    setActiveDeck(updatedDeck);
    saveFlashcardDeck(updatedDeck);
    setDecks(getFlashcardDecks());

    if (currentCardIndex < updatedCards.length - 1) {
      setTimeout(() => setCurrentCardIndex(prev => prev + 1), 250);
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    if (!window.confirm('Delete this deck? This cannot be undone.')) return;
    deleteFlashcardDeck(deckId);
    setDecks(getFlashcardDecks());
    if (activeDeck?.id === deckId) {
      setActiveDeck(null);
      setPhase('home');
    }
  };

  const openDeck = (deck: FlashcardDeck) => {
    const sortedCards = [...deck.cards].sort((a, b) => {
      if (a.status === 'review' && b.status !== 'review') return -1;
      if (a.status !== 'review' && b.status === 'review') return 1;
      if (a.status === 'new' && b.status === 'got-it') return -1;
      if (a.status === 'got-it' && b.status === 'new') return 1;
      return 0;
    });

    setActiveDeck({ ...deck, cards: sortedCards });
    setCurrentCardIndex(0);
    setPhase('review');
  };

  const currentCard: FlashcardData | undefined = activeDeck?.cards[currentCardIndex];
  const reviewCount = activeDeck?.cards.filter(c => c.status === 'review').length || 0;
  const gotItCount = activeDeck?.cards.filter(c => c.status === 'got-it').length || 0;

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex items-center justify-between pl-14 md:pl-4 pr-4 h-12 border-b border-border shrink-0">
          <h1 className="text-[13px] font-semibold text-text-primary">Flashcards</h1>
          {phase !== 'home' && phase !== 'loading' && (
            <button
              onClick={() => { setPhase('home'); setActiveDeck(null); }}
              className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
            >
              Back to decks
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* Home */}
          {phase === 'home' && (
            <div className="max-w-xl mx-auto animate-fade-in-up">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[14px] font-medium text-text-primary">Your Decks</h2>
                <button
                  onClick={() => setPhase('generate')}
                  className="btn-primary"
                >
                  <Plus size={13} />
                  New Deck
                </button>
              </div>

              {decks.length === 0 ? (
                <div className="text-center py-16">
                  <Layers size={24} className="text-text-faint mx-auto mb-3" strokeWidth={1.5} />
                  <h3 className="text-[14px] font-medium text-text-primary mb-1">No decks yet</h3>
                  <p className="text-[12px] text-text-muted mb-5">
                    Create your first deck to start reviewing
                  </p>
                  <button
                    onClick={() => setPhase('generate')}
                    className="btn-primary"
                  >
                    Generate Flashcards
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {decks.map(deck => (
                    <div
                      key={deck.id}
                      className="flex items-center justify-between px-3 py-3 -mx-3 rounded-md
                                 hover:bg-bg-surface group cursor-pointer transition-colors duration-100"
                      onClick={() => openDeck(deck)}
                    >
                      <div>
                        <p className="text-[13px] font-medium text-text-primary">{deck.topic}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-text-muted">{deck.subject}</span>
                          <span className="text-[11px] text-text-faint">{deck.cards.length} cards</span>
                          <span className="text-[11px] text-success">
                            {deck.cards.filter(c => c.status === 'got-it').length} mastered
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteDeck(deck.id);
                        }}
                        className="p-1.5 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 text-text-faint hover:text-error transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generate */}
          {phase === 'generate' && (
            <div className="max-w-md mx-auto space-y-5 animate-fade-in-up">
              <div className="mb-4">
                <h2 className="text-[15px] font-medium text-text-primary mb-1">Generate Flashcards</h2>
                <p className="text-[12px] text-text-muted">Enter a topic or paste your notes</p>
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
                  onKeyDown={e => { if (e.key === 'Enter' && topic.trim()) handleGenerate(); }}
                  placeholder="e.g., Cell Biology, Thermodynamics..."
                  className="input-base"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-2 block">
                  Notes <span className="text-text-faint font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Paste your notes here..."
                  rows={5}
                  className="input-base resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className="btn-primary w-full justify-center py-2.5"
              >
                Generate Cards
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
              <p className="text-[13px] text-text-muted">Generating flashcards...</p>
            </div>
          )}

          {/* Review */}
          {phase === 'review' && activeDeck && currentCard && (
            <div className="max-w-lg mx-auto animate-fade-in-up">
              <div className="flex items-center justify-center gap-4 mb-5">
                <span className="text-[11px] text-text-muted">
                  {currentCardIndex + 1} / {activeDeck.cards.length}
                </span>
                <span className="text-[11px] text-success">{gotItCount} mastered</span>
                <span className="text-[11px] text-error">{reviewCount} to review</span>
              </div>

              <Flashcard key={currentCard.id} card={currentCard} onMark={handleMark} />

              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                  disabled={currentCardIndex === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] text-text-muted
                             hover:text-text-primary disabled:opacity-25 transition-colors"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <button
                  onClick={() =>
                    setCurrentCardIndex(Math.min(activeDeck.cards.length - 1, currentCardIndex + 1))
                  }
                  disabled={currentCardIndex === activeDeck.cards.length - 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] text-text-muted
                             hover:text-text-primary disabled:opacity-25 transition-colors"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
