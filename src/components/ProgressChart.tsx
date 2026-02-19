'use client';

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  subtitle?: string;
}

export function ProgressBar({ label, value, max = 100, subtitle }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[13px] font-medium text-text-primary truncate">{label}</span>
          {subtitle && <span className="text-[11px] text-text-muted shrink-0">{subtitle}</span>}
        </div>
        <span className="text-[12px] text-text-muted shrink-0 ml-2">{Math.round(percentage)}%</span>
      </div>
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${
            percentage >= 70 ? 'bg-success' : percentage >= 50 ? 'bg-warning' : 'bg-error'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-7 h-7 rounded-md bg-accent-subtle flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span className="text-[11px] text-success font-medium">{trend}</span>
        )}
      </div>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-secondary mt-0.5">{label}</p>
    </div>
  );
}
