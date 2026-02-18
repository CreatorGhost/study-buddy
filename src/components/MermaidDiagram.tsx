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
            background: '#111113',
            primaryColor: '#5e6ad2',
            primaryTextColor: '#eeeff1',
            primaryBorderColor: '#5e6ad2',
            lineColor: '#5e5f63',
            secondaryColor: '#191a1c',
            tertiaryColor: '#111113',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            nodeBorder: '#5e6ad2',
            mainBkg: '#191a1c',
            clusterBkg: '#111113',
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
      <div className="bg-bg-surface border border-border rounded-lg p-3 text-text-muted text-[12px]">
        <p>Diagram preview:</p>
        <pre className="mt-2 text-[11px] bg-bg-inset p-3 rounded-md overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      className={`bg-bg-surface border border-border rounded-lg p-4 overflow-x-auto transition-opacity duration-200 ${rendered ? 'opacity-100' : 'opacity-50'}`}
    >
      <div ref={containerRef} className="flex justify-center min-h-[100px]" />
    </div>
  );
}
