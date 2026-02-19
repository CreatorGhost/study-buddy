'use client';

interface SectionScore {
  section: string;
  label: string;
  score: number;
  maxScore: number;
  answered: number;
  total: number;
}

interface PYQSectionBreakdownProps {
  sections: SectionScore[];
}

export default function PYQSectionBreakdown({ sections }: PYQSectionBreakdownProps) {
  if (sections.length === 0) return null;

  const totalScore = sections.reduce((sum, s) => sum + s.score, 0);
  const totalMax = sections.reduce((sum, s) => sum + s.maxScore, 0);

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium text-text-faint uppercase tracking-wider">
          Section-wise Breakdown
        </h3>
        <span className="text-[12px] font-semibold text-text-primary">
          {totalScore}/{totalMax} marks
        </span>
      </div>

      <div className="space-y-3">
        {sections.map((sec) => {
          const percent = sec.maxScore > 0 ? Math.round((sec.score / sec.maxScore) * 100) : 0;
          const barColor =
            percent >= 80 ? 'bg-success' : percent >= 50 ? 'bg-accent' : 'bg-error';

          return (
            <div key={sec.section}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-text-secondary">
                  Section {sec.section}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-faint">
                    {sec.answered}/{sec.total} answered
                  </span>
                  <span className="text-[11px] font-medium text-text-muted">
                    {sec.score}/{sec.maxScore}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
