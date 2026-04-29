import React from 'react';
import { Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatNOK } from '@/lib/utils';

/**
 * Shows expected vs actual membership fee revenue.
 * expectedMemberCount × ratePerMember = annual budget
 * Prorates by day-of-year to show how much should be collected by now.
 */
export default function MembershipRevenueWidget({ budgetLine, actualIncome, season }) {
  if (!budgetLine) return null;

  const memberCount = budgetLine.expected_member_count || 0;
  const ratePerMember = budgetLine.rate_per_member || 0;
  const annualBudget = budgetLine.budgeted_amount || (memberCount * ratePerMember);

  if (annualBudget === 0) return null;

  // Calculate fraction of season elapsed
  const today = new Date();
  let fractionElapsed = 1;

  if (season?.start_date && season?.end_date) {
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);
    const totalMs = end - start;
    const elapsedMs = Math.min(today - start, totalMs);
    fractionElapsed = totalMs > 0 ? Math.max(0, Math.min(1, elapsedMs / totalMs)) : 1;
  } else {
    // Fall back to day-of-year if no season dates
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    const totalMs = endOfYear - startOfYear;
    const elapsedMs = today - startOfYear;
    fractionElapsed = Math.max(0, Math.min(1, elapsedMs / totalMs));
  }

  const expectedSoFar = Math.round(annualBudget * fractionElapsed);
  const diff = actualIncome - expectedSoFar;
  const isAhead = diff >= 0;
  const pct = expectedSoFar > 0 ? Math.round((actualIncome / expectedSoFar) * 100) : 0;

  return (
    <div className={`rounded-2xl border p-5 ${isAhead
      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
      : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {isAhead
            ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-semibold ${isAhead ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
              Kontingentinntekter – status
            </p>
            <p className={`text-xs mt-0.5 ${isAhead ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
              {isAhead
                ? `${formatNOK(diff)} foran forventet innbetalingstakt`
                : `${formatNOK(Math.abs(diff))} bak forventet innbetalingstakt`}
            </p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isAhead ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
          {pct}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Årsbudsjett</p>
          <p className="text-sm font-bold">{formatNOK(annualBudget)}</p>
          {memberCount > 0 && ratePerMember > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{memberCount} × {formatNOK(ratePerMember)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Forventet hittil</p>
          <p className="text-sm font-bold">{formatNOK(expectedSoFar)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(fractionElapsed * 100)}% av sesong</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Faktisk innbetalt</p>
          <p className={`text-sm font-bold ${isAhead ? 'text-green-600' : 'text-yellow-700'}`}>{formatNOK(actualIncome)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isAhead ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}