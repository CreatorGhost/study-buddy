'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { Message, Subject, AgentType, StreamEvent } from '@/types';
import { Sparkles, Plus, MessageSquare, Trash2 } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  subject: string;
  created_at: string;
  updated_at: string;
}

const starterPrompts = [
  "Explain Newton's laws of motion with real-life examples",
  'What is electromagnetic induction?',
  'Explain the process of photosynthesis step by step',
  'Derive the quadratic formula',
  'What are p-block elements?',
  'Explain the concept of derivatives in calculus',
];

export default function LearnPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [subject, setSubject] = useState<Subject>('Physics');
  const [activeAgent, setActiveAgent] = useState<AgentType | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Supabase not configured yet — silent fail
    }
  }

  // Save conversation to Supabase (debounced)
  const saveConversation = useCallback((msgs: Message[], convId: string, subj: Subject) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (msgs.length === 0) return;

      const firstUserMsg = msgs.find(m => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
        : 'New Chat';

      try {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: convId,
            title,
            subject: subj,
            messages: msgs,
          }),
        });
        loadConversations();
      } catch {
        // Silent fail if Supabase not configured
      }
    }, 1000);
  }, []);

  async function loadConversation(conv: Conversation) {
    // Fetch full conversation with messages via Supabase client
    try {
      const { getSupabase, isSupabaseConfigured } = await import('@/lib/supabase');
      if (!isSupabaseConfigured()) return;

      const supabase = getSupabase();
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conv.id)
        .single();

      if (data) {
        setConversationId(data.id);
        setMessages(data.messages || []);
        setSubject(data.subject as Subject);
        setShowHistory(false);
      }
    } catch {
      // Silent fail
    }
  }

  async function deleteConversation(id: string) {
    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        startNewChat();
      }
    } catch {
      // ignore
    }
  }

  function startNewChat() {
    setMessages([]);
    setConversationId(null);
    setActiveAgent(null);
    setShowHistory(false);
  }

  const handleSend = async (content: string) => {
    // Create conversation ID if new chat
    const convId = conversationId || `conv_${Date.now()}`;
    if (!conversationId) setConversationId(convId);

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);

    const assistantId = `msg_${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    let finalMessages = [...newMessages, assistantMessage];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, subject }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));

            if (event.type === 'agent_selected' && event.agent) {
              setActiveAgent(event.agent);
              setMessages(prev => {
                const updated = prev.map(m => m.id === assistantId ? { ...m, agent: event.agent } : m);
                finalMessages = updated;
                return updated;
              });
            }

            if (event.type === 'text_delta') {
              setMessages(prev => {
                const updated = prev.map(m =>
                  m.id === assistantId ? { ...m, content: m.content + event.data } : m
                );
                finalMessages = updated;
                return updated;
              });
            }

            if (event.type === 'done') {
              setIsStreaming(false);
              setActiveAgent(null);
              // Save completed conversation
              saveConversation(finalMessages, convId, subject);
            }

            if (event.type === 'error') {
              setMessages(prev => {
                const updated = prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: `Sorry, something went wrong: ${event.data}` }
                    : m
                );
                finalMessages = updated;
                return updated;
              });
              setIsStreaming(false);
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, I could not connect to the server. Please try again.' }
            : m
        );
        finalMessages = updated;
        return updated;
      });
      setIsStreaming(false);
    }
  };

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Learn</h1>
              <p className="text-xs text-text-muted">AI-powered Socratic tutor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeAgent && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-accent-2/10 text-accent-2 animate-fade-in">
                {activeAgent.charAt(0).toUpperCase() + activeAgent.slice(1)} Agent
              </span>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
              title="Chat history"
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={startNewChat}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
              title="New chat"
            >
              <Plus size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat history panel */}
          {showHistory && (
            <div className="w-64 border-r border-border bg-bg-surface/50 overflow-y-auto flex-shrink-0 animate-fade-in">
              <div className="p-3 border-b border-border">
                <p className="text-xs font-medium text-text-muted">Chat History</p>
              </div>
              {conversations.length === 0 ? (
                <p className="text-xs text-text-muted p-4 text-center">No saved chats yet</p>
              ) : (
                <div className="space-y-0.5 p-1.5">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                        ${conversationId === conv.id
                          ? 'bg-accent-2/10 text-text-primary'
                          : 'text-text-secondary hover:bg-bg-elevated/50'
                        }`}
                      onClick={() => loadConversation(conv)}
                    >
                      <MessageSquare size={13} className="flex-shrink-0 text-text-muted" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{conv.title}</p>
                        <p className="text-[10px] text-text-muted">{conv.subject}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/10 text-text-muted hover:text-error transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main chat area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full animate-fade-in-up">
                  <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center mb-6 accent-glow">
                    <Sparkles size={28} className="text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">What would you like to learn?</h2>
                  <p className="text-sm text-text-muted mb-8 text-center max-w-md">
                    Ask me anything about your CBSE Class 12 subjects. I&apos;ll explain concepts, show diagrams, and guide you step by step.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                    {starterPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className={`text-left px-4 py-3 rounded-lg border border-border text-sm text-text-secondary
                                   hover:border-border-hover hover:text-text-primary hover:bg-bg-surface/50
                                   transition-all duration-150 animate-fade-in-up stagger-${(i % 4) + 1}`}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                  />
                ))
              )}
            </div>

            {/* Input */}
            <div className="px-6 pb-6">
              <ChatInput
                onSend={handleSend}
                disabled={isStreaming}
                subject={subject}
                onSubjectChange={setSubject}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
