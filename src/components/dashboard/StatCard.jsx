import React from 'react';
import { cn } from '@/lib/utils';

// trend can be a number (legacy) or { value: number, label: string }
export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendLabel, variant = 'default' }) {
  const trendValue = typeof trend === 'object' ? trend?.value : trend;
  const trendLabelText = typeof trend === 'object' ? trend?.label : trendLabel;
  const variants = {
    default: 'border-border',
    success: 'border-l-4 border-l-green-500',
    warning: 'border-l-4 border-l-yellow-500',
    danger: 'border-l-4 border-l-red-500',
    info: 'border-l-4 border-l-blue-500',
  };

  return (
    <div className={cn("bg-card rounded-xl border p-5 transition-shadow hover:shadow-md", variants[variant])}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-muted">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      {trendValue !== undefined && trendValue !== null && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={cn("font-semibold", trendValue >= 0 ? "text-green-600" : "text-red-600")}>
            {trendValue >= 0 ? '↑' : '↓'} {Math.abs(trendValue)}%
          </span>
          {trendLabelText && <span className="text-muted-foreground">{trendLabelText}</span>}
        </div>
      )}
    </div>
  );
}