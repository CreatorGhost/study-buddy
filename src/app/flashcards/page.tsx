'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import SubjectSelector from '@/components/SubjectSelector';
import Flashcard from '@/components/Flashcard';
import { Subject, FlashcardData, FlashcardDeck } from '@/types';
import { getFlashcardDecks, saveFlashcardDeck, deleteFlashcardDeck } from '@/lib/storage';
import { CreditCard, Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

type Phase = 'home' | 'generate' | 'loading' | 'review';

export default function FlashcardsPage() {
  const [phase, setPhase] = useState<Phase>('home');
  const [subject, setSubject] = useState<Subject>('Physics');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    setDecks(getFlashcardDecks());
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
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
      alert('Failed to generate flashcards. Please try again.');
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

    // Auto-advance to next card
    if (currentCardIndex < updatedCards.length - 1) {
      setTimeout(() => setCurrentCardIndex(prev => prev + 1), 300);
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    deleteFlashcardDeck(deckId);
    setDecks(getFlashcardDecks());
    if (activeDeck?.id === deckId) {
      setActiveDeck(null);
      setPhase('home');
    }
  };

  const openDeck = (deck: FlashcardDeck) => {
    // Prioritize cards that need review
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
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Flashcards</h1>
            <p className="text-xs text-text-muted">Generate & review study cards</p>
          </div>
          {phase !== 'home' && phase !== 'loading' && (
            <button
              onClick={() => { setPhase('home'); setActiveDeck(null); }}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Back to decks
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Home - deck list */}
          {phase === 'home' && (
            <div className="max-w-2xl mx-auto animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-medium text-text-primary">Your Decks</h2>
                <button
                  onClick={() => setPhase('generate')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg accent-gradient text-sm
                             font-medium text-white hover:accent-glow transition-all"
                >
                  <Plus size={16} />
                  New Deck
                </button>
              </div>

              {decks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-4 accent-glow">
                    <CreditCard size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">No flashcard decks yet</h3>
                  <p className="text-sm text-text-muted mb-6">
                    Create your first deck to start reviewing
                  </p>
                  <button
                    onClick={() => setPhase('generate')}
                    className="px-4 py-2 rounded-lg accent-gradient text-sm font-medium text-white hover:accent-glow transition-all"
                  >
                    Generate Flashcards
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {decks.map(deck => (
                    <div
                      key={deck.id}
                      className="glass-card p-4 flex items-center justify-between group cursor-pointer"
                      onClick={() => openDeck(deck)}
                    >
                      <div>
                        <h3 className="text-sm font-medium text-text-primary">{deck.topic}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-text-muted">{deck.subject}</span>
                          <span className="text-xs text-text-muted">{deck.cards.length} cards</span>
                          <span className="text-xs text-success">
                            {deck.cards.filter(c => c.status === 'got-it').length} mastered
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteDeck(deck.id);
                        }}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-error/10 text-text-muted hover:text-error transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generate phase */}
          {phase === 'generate' && (
            <div className="max-w-lg mx-auto space-y-6 animate-fade-in-up">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-text-primary">Generate Flashcards</h2>
                <p className="text-sm text-text-muted mt-1">Enter a topic or paste your notes</p>
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Subject</label>
                <SubjectSelector value={subject} onChange={setSubject} variant="chips" />
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g., Cell Biology, Thermodynamics..."
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm
                             text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  Notes <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Paste your notes here to generate flashcards from them..."
                  rows={6}
                  className="w-full bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm
                             text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-2 resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className="w-full py-3 rounded-lg accent-gradient text-white font-medium
                           hover:accent-glow transition-all disabled:opacity-40"
              >
                Generate Cards
              </button>
            </div>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <Loader2 size={40} className="text-accent-2 animate-spin mb-4" />
              <p className="text-sm text-text-muted">Generating flashcards...</p>
            </div>
          )}

          {/* Review */}
          {phase === 'review' && activeDeck && currentCard && (
            <div className="max-w-lg mx-auto animate-fade-in-up">
              {/* Stats */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <span className="text-xs text-text-muted">
                  {currentCardIndex + 1} / {activeDeck.cards.length}
                </span>
                <span className="text-xs text-success">{gotItCount} mastered</span>
                <span className="text-xs text-error">{reviewCount} to review</span>
              </div>

              {/* Card */}
              <Flashcard card={currentCard} onMark={handleMark} />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                  disabled={currentCardIndex === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-muted
                             hover:text-text-primary disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentCardIndex(Math.min(activeDeck.cards.length - 1, currentCardIndex + 1))
                  }
                  disabled={currentCardIndex === activeDeck.cards.length - 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-muted
                             hover:text-text-primary disabled:opacity-30 transition-all"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
