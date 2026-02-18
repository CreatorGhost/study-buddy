'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

function sanitizeMermaidCode(code: string): string {
  // Quote node labels that contain special characters
  // Replace unquoted labels like A[Newton's Laws] with A["Newton's Laws"]
  return code.replace(
    /(\w+)\[([^\]"]*?['\d][^\]"]*?)\]/g,
    (_, id, label) => `${id}["${label.replace(/"/g, '#quot;')}"]`
  ).replace(
    /(\w+)\(([^)"]*?['\d][^)"]*?)\)/g,
    (_, id, label) => `${id}("${label.replace(/"/g, '#quot;')}")`
  );
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const renderAttemptRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const attempt = ++renderAttemptRef.current;

    // Debounce: wait 300ms to avoid rendering partial streaming content
    const timer = setTimeout(async () => {
      if (cancelled || attempt !== renderAttemptRef.current) return;
      if (!containerRef.current || !chart.trim()) return;

      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          suppressErrorRendering: true,
          themeVariables: {
            darkMode: true,
            background: '#0f1117',
            primaryColor: '#5643CC',
            primaryTextColor: '#f7f8f8',
            primaryBorderColor: '#455EB5',
            lineColor: '#858699',
            secondaryColor: '#1a1b23',
            tertiaryColor: '#0f1117',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            nodeBorder: '#455EB5',
            mainBkg: '#1a1b23',
            clusterBkg: '#0f1117',
          },
          flowchart: { curve: 'basis', padding: 15 },
          mindmap: { padding: 20 },
        });

        const sanitized = sanitizeMermaidCode(chart.trim());
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, sanitized);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
          setError(null);
        }
      } catch {
        // Silently ignore - likely partial/incomplete diagram during streaming
        if (!cancelled) {
          setError('Could not render diagram');
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart]);

  if (error) {
    return (
      <div className="glass-card p-4 text-text-muted text-sm">
        <p>Diagram preview:</p>
        <pre className="mt-2 text-xs bg-bg-elevated p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      className={`glass-card p-4 overflow-x-auto transition-opacity duration-300 ${rendered ? 'opacity-100' : 'opacity-50'}`}
    >
      <div ref={containerRef} className="flex justify-center min-h-[100px]" />
    </div>
  );
}
