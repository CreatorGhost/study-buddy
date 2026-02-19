'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
}

function sanitizeMermaidCode(code: string): string {
  return code.replace(
    /(\w+)\[([^\]"]*?['\d][^\]"]*?)\]/g,
    (_, id, label) => `${id}["${label.replace(/"/g, '#quot;')}"]`
  ).replace(
    /(\w+)\(([^)"]*?['\d][^)"]*?)\)/g,
    (_, id, label) => `${id}("${label.replace(/"/g, '#quot;')}")`
  );
}

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const renderAttemptRef = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [panning, setPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Escape key closes fullscreen
  useEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [expanded]);

  useEffect(() => {
    let cancelled = false;
    const attempt = ++renderAttemptRef.current;

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
          // Remove hardcoded width/height so the SVG scales with zoom
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
          setRendered(true);
          setError(null);
        }
      } catch {
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

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleToggleExpand = useCallback(() => {
    setExpanded((e) => !e);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!panning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [panning]);

  const handlePointerUp = useCallback(() => {
    setPanning(false);
  }, []);

  if (error) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-3 text-text-muted text-[12px]">
        <p>Diagram preview:</p>
        <pre className="mt-2 text-[11px] bg-bg-inset p-3 rounded-md overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  const wrapperClasses = expanded
    ? 'fixed inset-0 z-50 bg-bg-base/95 backdrop-blur-sm flex flex-col'
    : 'bg-bg-surface border border-border rounded-lg relative';

  return (
    <div className={`${wrapperClasses} transition-opacity duration-200 ${rendered ? 'opacity-100' : 'opacity-50'}`}>
      {/* Toolbar */}
      {rendered && (
        <div className={`flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border ${expanded ? '' : 'rounded-t-lg'}`}>
          <span className="text-[11px] text-text-faint">
            {Math.round(zoom * 100)}%
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={handleReset}
              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors"
              title="Reset zoom"
            >
              <RotateCcw size={13} />
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onClick={handleToggleExpand}
              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors"
              title={expanded ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
      )}

      {/* Diagram area */}
      <div
        ref={svgWrapRef}
        className={`overflow-hidden ${expanded ? 'flex-1' : ''} ${zoom > 1 ? 'cursor-grab' : ''} ${panning ? 'cursor-grabbing' : ''}`}
        style={{ minHeight: expanded ? undefined : 100 }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          ref={containerRef}
          className={`flex justify-center ${expanded ? 'h-full items-center' : 'p-4'}`}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: panning ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>

      {/* Escape hint in fullscreen */}
      {expanded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-text-faint bg-bg-elevated/80 px-3 py-1 rounded-full border border-border">
          Press <kbd className="px-1 py-0.5 bg-bg-surface rounded text-[10px] font-mono">Esc</kbd> or click <Minimize2 size={10} className="inline -mt-0.5" /> to exit
        </div>
      )}
    </div>
  );
}
