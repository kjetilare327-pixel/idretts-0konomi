import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingDown, Users, ArrowRight } from 'lucide-react';
import { formatNOK } from '@/lib/utils';

export default function PlayerBalanceWidget({ members = [], payments = [] }) {
  const playersWithDebt = useMemo(() => {
    return members
      .map(m => {
        const memberPayments = payments.filter(p => (p.member_ids || []).includes(m.id) && p.status !== 'paid');
        const owed = memberPayments.reduce((s, p) => s + ((p.total_amount || 0) - (p.amount_paid || 0)), 0);
        return { ...m, owed };
      })
      .filter(m => m.owed > 0)
      .sort((a, b) => b.owed - a.owed)
      .slice(0, 5);
  }, [members, payments]);

  const totalOwed = useMemo(() =>
    playersWithDebt.reduce((s, m) => s + m.owed, 0),
    [playersWithDebt]
  );

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Spillersaldo</h3>
            <p className="text-xs text-muted-foreground">Topp skyldnere</p>
          </div>
        </div>
        <Link to="/player-balance" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
          Se alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {playersWithDebt.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Alle spillere er à jour! 🎉
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {playersWithDebt.map(m => (
              <div key={m.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-primary">{m.full_name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.full_name}</p>
                    {m.team && <p className="text-[10px] text-muted-foreground">{m.team}</p>}
                  </div>
                </div>
                <span className="text-sm font-bold text-red-600 flex-shrink-0">{formatNOK(m.owed)}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total utestående ({playersWithDebt.length} spillere)</span>
            <span className="text-sm font-bold text-red-600">{formatNOK(totalOwed)}</span>
          </div>
        </>
      )}
    </div>
  );
}