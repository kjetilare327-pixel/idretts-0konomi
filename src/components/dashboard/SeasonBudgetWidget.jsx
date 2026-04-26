import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ArrowRight, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatNOK, CATEGORIES } from '@/lib/utils';

export default function SeasonBudgetWidget() {
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-year', 10),
  });

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['budgetLines'],
    queryFn: () => base44.entities.BudgetLine.list('-created_date', 200),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500),
  });

  const activeSeason = seasons.find(s => s.status === 'active') || seasons[0];

  const seasonLines = useMemo(() =>
    budgetLines.filter(b => b.season_id === activeSeason?.id),
    [budgetLines, activeSeason]
  );

  const seasonTx = useMemo(() => {
    if (!activeSeason) return transactions;
    return transactions.filter(t => {
      const d = new Date(t.date);
      const start = activeSeason.start_date ? new Date(activeSeason.start_date) : null;
      const end = activeSeason.end_date ? new Date(activeSeason.end_date) : null;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [transactions, activeSeason]);

  // Top 4 expense categories with most usage
  const categoryStatus = useMemo(() => {
    const expenseLines = seasonLines.filter(b => b.type === 'expense');
    const map = {};
    expenseLines.forEach(b => {
      if (!map[b.category]) map[b.category] = { budgeted: 0 };
      map[b.category].budgeted += b.budgeted_amount || 0;
    });
    return Object.entries(map).map(([cat, { budgeted }]) => {
      const actual = seasonTx.filter(t => t.category === cat && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
      const pct = budgeted > 0 ? (actual / budgeted) * 100 : 0;
      return { cat, budgeted, actual, pct };
    }).sort((a, b) => b.pct - a.pct).slice(0, 4);
  }, [seasonLines, seasonTx]);

  const overBudget = categoryStatus.filter(c => c.pct >= 100).length;
  const nearBudget = categoryStatus.filter(c => c.pct >= 85 && c.pct < 100).length;

  if (!activeSeason || seasonLines.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">Sesongbudsjett</h3>
          </div>
          <Link to="/season-budget" className="text-xs text-primary hover:underline flex items-center gap-1">
            Sett opp <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Ingen budsjett for aktiv sesong. Klikk for å sette opp.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Sesongbudsjett</h3>
        </div>
        <Link to="/season-budget" className="text-xs text-primary hover:underline flex items-center gap-1">
          Detaljer <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{activeSeason.name}</p>

      {(overBudget > 0 || nearBudget > 0) && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            {overBudget > 0 && `${overBudget} kategori(er) over budsjett`}
            {overBudget > 0 && nearBudget > 0 && ', '}
            {nearBudget > 0 && `${nearBudget} nær grensen`}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {categoryStatus.map(({ cat, budgeted, actual, pct }) => {
          const color = pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-yellow-500' : 'bg-green-500';
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{CATEGORIES[cat]?.label || cat}</span>
                <span className={`text-xs font-semibold ${pct >= 100 ? 'text-red-600' : pct >= 85 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatNOK(actual)} / {formatNOK(budgeted)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}