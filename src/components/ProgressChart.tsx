'use client';

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  subtitle?: string;
}

export function ProgressBar({ label, value, max = 100, subtitle, color }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-sm text-text-muted">{Math.round(percentage)}%</span>
      </div>
      {subtitle && <span className="text-xs text-text-muted">{subtitle}</span>}
      <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${percentage}%`,
            background: color || 'linear-gradient(90deg, #455EB5, #5643CC, #673FD7)',
          }}
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
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-accent-2/10 flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span className="text-xs text-success font-medium">{trend}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}
