'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Message, AgentType } from '@/types';
import MermaidDiagram from './MermaidDiagram';
import { User, Bot, BookOpen, Brain, GitBranch, CreditCard } from 'lucide-react';

const agentBadge: Record<AgentType, { label: string; icon: typeof Bot }> = {
  orchestrator: { label: 'AI', icon: Bot },
  tutor: { label: 'Tutor', icon: BookOpen },
  quiz: { label: 'Quiz', icon: Brain },
  diagram: { label: 'Diagram', icon: GitBranch },
  flashcard: { label: 'Flashcard', icon: CreditCard },
};

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const badge = message.agent ? agentBadge[message.agent] : null;

  // Check which mermaid blocks are complete (have closing ```)
  // Only render complete blocks as diagrams; incomplete ones show as raw code
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
        <div className="flex-shrink-0 w-8 h-8 rounded-lg accent-gradient flex items-center justify-center mt-1">
          {badge ? <badge.icon size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        {!isUser && badge && (
          <span className="text-[11px] font-medium text-accent-2 mb-1 block">
            {badge.label} Agent
          </span>
        )}
        <div
          className={`
            rounded-xl px-4 py-3 text-sm leading-relaxed
            ${isUser
              ? 'bg-accent-2/20 text-text-primary border border-accent-2/20'
              : 'bg-bg-surface border border-border'
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
                      // Only render as diagram if this block is complete
                      if (completeMermaidBlocks.has(content)) {
                        return <MermaidDiagram chart={content} />;
                      }
                      // Incomplete block during streaming - show as styled code
                      return (
                        <pre className="bg-bg-elevated border border-border rounded-lg p-4 overflow-x-auto my-3">
                          <div className="flex items-center gap-2 mb-2 text-xs text-accent-2">
                            <GitBranch size={12} />
                            <span>Generating diagram...</span>
                          </div>
                          <code className="text-text-muted text-xs">{content}</code>
                        </pre>
                      );
                    }

                    if (match) {
                      return (
                        <pre className="bg-bg-elevated border border-border rounded-lg p-4 overflow-x-auto my-3">
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
            <span className="inline-block w-2 h-4 bg-accent-2 rounded-sm animate-pulse ml-1" />
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-bg-elevated border border-border flex items-center justify-center mt-1">
          <User size={16} className="text-text-muted" />
        </div>
      )}
    </div>
  );
}
