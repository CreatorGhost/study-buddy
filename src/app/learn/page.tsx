'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { Message, Subject, AgentType, StreamEvent } from '@/types';
import { Sparkles } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (content: string) => {
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
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, agent: event.agent } : m)
              );
            }

            if (event.type === 'text_delta') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: m.content + event.data } : m
                )
              );
            }

            if (event.type === 'done') {
              setIsStreaming(false);
              setActiveAgent(null);
            }

            if (event.type === 'error') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: `Sorry, something went wrong: ${event.data}` }
                    : m
                )
              );
              setIsStreaming(false);
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, I could not connect to the server. Please try again.' }
            : m
        )
      );
      setIsStreaming(false);
    }
  };

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Learn</h1>
            <p className="text-xs text-text-muted">AI-powered Socratic tutor</p>
          </div>
          {activeAgent && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-accent-2/10 text-accent-2 animate-fade-in">
              {activeAgent.charAt(0).toUpperCase() + activeAgent.slice(1)} Agent
            </span>
          )}
        </header>

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
      </main>
    </>
  );
}
