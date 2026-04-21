import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendLabel, variant = 'default' }) {
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
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={cn("font-semibold", trend >= 0 ? "text-green-600" : "text-red-600")}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}