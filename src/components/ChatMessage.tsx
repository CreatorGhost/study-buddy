'use client';

import { useMemo, useState, useCallback } from 'react';
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

const MERMAID_BLOCK_RE = /```mermaid\n([\s\S]*?)```/g;

interface ContentSegment {
  type: 'markdown' | 'mermaid-complete' | 'mermaid-streaming';
  content: string;
  key: string;
}

/**
 * Split message content into segments: markdown text and mermaid blocks.
 * Complete blocks are extracted so they can be rendered as stable components
 * outside ReactMarkdown (prevents remounting during streaming).
 */
function splitContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let mermaidIndex = 0;

  const regex = new RegExp(MERMAID_BLOCK_RE.source, 'g');
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Text before this mermaid block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.trim()) {
        segments.push({ type: 'markdown', content: text, key: `md-${lastIndex}` });
      }
    }

    segments.push({
      type: 'mermaid-complete',
      content: match[1].replace(/\n$/, ''),
      key: `mermaid-${mermaidIndex}`,
    });
    mermaidIndex++;
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last mermaid block
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);

    // Check for an incomplete/streaming mermaid block at the end
    const incompleteMatch = remaining.match(/```mermaid\n([\s\S]*)$/);
    if (incompleteMatch) {
      const textBefore = remaining.slice(0, incompleteMatch.index);
      if (textBefore.trim()) {
        segments.push({ type: 'markdown', content: textBefore, key: `md-${lastIndex}` });
      }
      segments.push({
        type: 'mermaid-streaming',
        content: incompleteMatch[1],
        key: `mermaid-streaming-${mermaidIndex}`,
      });
    } else if (remaining.trim()) {
      segments.push({ type: 'markdown', content: remaining, key: `md-${lastIndex}` });
    }
  }

  return segments;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const badge = message.agent ? agentBadge[message.agent] : null;
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const handleCopy = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(code);
    setTimeout(() => setCopiedBlock(null), 2000);
  }, []);

  const segments = useMemo(() => splitContent(message.content), [message.content]);

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {!isUser && (
        <div className="shrink-0 w-6 h-6 rounded-md bg-bg-elevated border border-border flex items-center justify-center mt-0.5">
          {badge ? <badge.icon size={12} className="text-text-muted" strokeWidth={1.75} /> : <Bot size={12} className="text-text-muted" strokeWidth={1.75} />}
        </div>
      )}

      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'order-first' : ''}`}>
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
            <div className="prose-study space-y-2">
              {segments.map((seg) => {
                if (seg.type === 'mermaid-complete') {
                  return <MermaidDiagram key={seg.key} chart={seg.content} />;
                }

                if (seg.type === 'mermaid-streaming') {
                  return (
                    <pre key={seg.key} className="bg-bg-inset border border-border rounded-lg p-3 overflow-x-auto my-2">
                      <div className="flex items-center gap-1.5 mb-2 text-[11px] text-text-muted">
                        <GitBranch size={11} />
                        <span>Generating diagram...</span>
                      </div>
                      <code className="text-text-faint text-[11px]">{seg.content}</code>
                    </pre>
                  );
                }

                return (
                  <ReactMarkdown
                    key={seg.key}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const content = String(children).replace(/\n$/, '');

                        if (match) {
                          return (
                            <pre className="bg-bg-inset border border-border rounded-lg p-3 overflow-x-auto my-2 relative group/code">
                              <button
                                onClick={() => handleCopy(content)}
                                className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-bg-elevated border border-border text-text-faint
                                           hover:text-text-secondary opacity-0 group-hover/code:opacity-100 transition-opacity text-[11px]"
                                title="Copy code"
                              >
                                {copiedBlock === content ? 'Copied!' : 'Copy'}
                              </button>
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
                    {seg.content}
                  </ReactMarkdown>
                );
              })}
            </div>
          )}
          {isStreaming && !message.content && (
            <div className="typing-indicator flex items-center gap-1 py-1">
              <span /><span /><span />
            </div>
          )}
          {isStreaming && message.content && (
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
