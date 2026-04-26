import React from 'react';
import { cn } from '@/lib/utils';

// trend can be a number (legacy) or { value: number, label: string }
export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendLabel, variant = 'default' }) {
  const trendValue = typeof trend === 'object' ? trend?.value : trend;
  const trendLabelText = typeof trend === 'object' ? trend?.label : trendLabel;
  const iconVariants = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className={cn("bg-card rounded-2xl border border-border p-6 transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200")}>
      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div className={cn("p-3 rounded-xl", iconVariants[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {trendValue !== undefined && trendValue !== null && (
        <div className="mt-3 flex items-center gap-1.5 text-xs pt-3 border-t border-border">
          <span className={cn("font-semibold", trendValue >= 0 ? "text-green-600" : "text-red-600")}>
            {trendValue >= 0 ? '↑' : '↓'} {Math.abs(trendValue)}%
          </span>
          {trendLabelText && <span className="text-muted-foreground">{trendLabelText}</span>}
        </div>
      )}
    </div>
  );
}