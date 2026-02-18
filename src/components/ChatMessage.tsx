'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Message, AgentType } from '@/types';
import MermaidDiagram from './MermaidDiagram';
import { User, Bot, BookOpen, Brain, GitBranch, Layers } from 'lucide-react';

const agentBadge: Record<AgentType, { label: string; icon: typeof Bot }> = {
  orchestrator: { label: 'AI', icon: Bot },
  tutor: { label: 'Tutor', icon: BookOpen },
  quiz: { label: 'Quiz', icon: Brain },
  diagram: { label: 'Diagram', icon: GitBranch },
  flashcard: { label: 'Flashcard', icon: Layers },
};

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const badge = message.agent ? agentBadge[message.agent] : null;

  const completeMermaidBlocks = useMemo(() => {
    const set = new Set<string>();
    const regex = /```mermaid\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(message.content)) !== null) {
      set.add(match[1].replace(/\n$/, ''));
    }
    return set;
  }, [message.content]);

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {!isUser && (
        <div className="shrink-0 w-6 h-6 rounded-md bg-bg-elevated border border-border flex items-center justify-center mt-0.5">
          {badge ? <badge.icon size={12} className="text-text-muted" strokeWidth={1.75} /> : <Bot size={12} className="text-text-muted" strokeWidth={1.75} />}
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        {!isUser && badge && (
          <span className="text-[11px] font-medium text-text-muted mb-1 block">
            {badge.label}
          </span>
        )}
        <div
          className={`
            rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed
            ${isUser
              ? 'bg-bg-elevated text-text-primary'
              : 'bg-transparent'
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-study">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const content = String(children).replace(/\n$/, '');

                    if (match?.[1] === 'mermaid') {
                      if (completeMermaidBlocks.has(content)) {
                        return <MermaidDiagram chart={content} />;
                      }
                      return (
                        <pre className="bg-bg-inset border border-border rounded-lg p-3 overflow-x-auto my-2">
                          <div className="flex items-center gap-1.5 mb-2 text-[11px] text-text-muted">
                            <GitBranch size={11} />
                            <span>Generating diagram...</span>
                          </div>
                          <code className="text-text-faint text-[11px]">{content}</code>
                        </pre>
                      );
                    }

                    if (match) {
                      return (
                        <pre className="bg-bg-inset border border-border rounded-lg p-3 overflow-x-auto my-2">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre({ children }) {
                    return <>{children}</>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {isStreaming && (
            <span className="inline-block w-[3px] h-[14px] bg-text-muted rounded-sm animate-pulse ml-0.5 -mb-0.5" />
          )}
        </div>
      </div>

      {isUser && (
        <div className="shrink-0 w-6 h-6 rounded-md bg-bg-elevated border border-border flex items-center justify-center mt-0.5">
          <User size={12} className="text-text-muted" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}
