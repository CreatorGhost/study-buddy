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
        <span className="text-[13px] font-medium text-text-primary">{label}</span>
        <span className="text-[12px] text-text-muted">{Math.round(percentage)}%</span>
      </div>
      {subtitle && <span className="text-[11px] text-text-faint">{subtitle}</span>}
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
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
      <p className="text-xl font-semibold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
