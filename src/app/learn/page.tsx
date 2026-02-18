'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { Message, Subject, AgentType, StreamEvent } from '@/types';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';

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
  'Explain photosynthesis step by step',
  'Derive the quadratic formula',
  'What are p-block elements?',
  'Explain OOP concepts in Python',
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
      // Supabase not configured yet
    }
  }

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
        // Silent fail
      }
    }, 1000);
  }, []);

  async function loadConversation(conv: Conversation) {
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
              saveConversation(finalMessages, convId, subject);
            }

            if (event.type === 'error') {
              setMessages(prev => {
                const updated = prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: `Something went wrong: ${event.data}` }
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
            ? { ...m, content: 'Could not connect to the server. Please try again.' }
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
        <header className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-semibold text-text-primary">Learn</h1>
            {activeAgent && (
              <span className="chip chip-accent">
                {activeAgent.charAt(0).toUpperCase() + activeAgent.slice(1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-md transition-colors duration-100
                ${showHistory ? 'bg-bg-hover text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'}`}
              title="Chat history"
            >
              <MessageSquare size={15} strokeWidth={1.75} />
            </button>
            <button
              onClick={startNewChat}
              className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors duration-100"
              title="New chat"
            >
              <Plus size={15} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat history panel */}
          {showHistory && (
            <div className="w-56 border-r border-border bg-bg-surface overflow-y-auto shrink-0 animate-fade-in">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">History</p>
              </div>
              {conversations.length === 0 ? (
                <p className="text-[12px] text-text-muted p-4 text-center">No saved chats</p>
              ) : (
                <div className="py-1">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-100
                        ${conversationId === conv.id
                          ? 'bg-bg-hover text-text-primary'
                          : 'text-text-secondary hover:bg-bg-elevated'
                        }`}
                      onClick={() => loadConversation(conv)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate">{conv.title}</p>
                        <p className="text-[11px] text-text-faint">{conv.subject}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-faint hover:text-error transition-all"
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full animate-fade-in-up">
                  <h2 className="text-[15px] font-medium text-text-primary mb-1.5">What would you like to learn?</h2>
                  <p className="text-[12px] text-text-muted mb-8 text-center max-w-sm">
                    Ask about any topic in Physics, Chemistry, Biology, Math, or CS. I&apos;ll explain, draw diagrams, and guide you step by step.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-w-lg w-full">
                    {starterPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className={`text-left px-3 py-2.5 rounded-md border border-border text-[12px] text-text-muted
                                   hover:border-border-hover hover:text-text-secondary hover:bg-bg-surface
                                   transition-colors duration-100 animate-fade-in-up stagger-${(i % 6) + 1}`}
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
            <div className="px-4 pb-4">
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
