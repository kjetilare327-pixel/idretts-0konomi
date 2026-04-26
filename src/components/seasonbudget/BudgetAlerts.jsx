import React from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { formatNOK } from '@/lib/utils';
import { CATEGORIES } from '@/lib/utils';

export default function BudgetAlerts({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const isOver = a.pct >= 100;
        return (
          <div
            key={a.category}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              isOver
                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOver ? 'text-red-600' : 'text-yellow-600'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isOver ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                {isOver ? 'Over budsjett' : 'Nær budsjettgrensen'}: {CATEGORIES[a.category]?.label || a.category}
              </p>
              <p className={`text-xs mt-0.5 ${isOver ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                Du er {Math.round(a.pct)}% av budsjett brukt ({formatNOK(a.actual)} av {formatNOK(a.budgeted)}).
                {isOver
                  ? ` Det er ${formatNOK(a.actual - a.budgeted)} over budsjett – vurder å justere.`
                  : ' Vurder å øke budsjettrammen eller redusere utgiftene.'
                }
              </p>
            </div>
            <TrendingUp className={`w-4 h-4 flex-shrink-0 ${isOver ? 'text-red-500' : 'text-yellow-500'}`} />
          </div>
        );
      })}
    </div>
  );
}