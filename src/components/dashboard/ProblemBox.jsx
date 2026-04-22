import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Users, TrendingDown, Clock } from 'lucide-react';
import { formatNOK } from '@/lib/utils';

export default function ProblemBox({ payments, members, teamFilter }) {
  const navigate = useNavigate();

  const relevant = teamFilter === 'all'
    ? payments
    : payments.filter(p => {
        const memberIds = p.member_ids || [];
        return memberIds.some(mid => {
          const m = members.find(m => m.id === mid);
          return m?.team === teamFilter;
        });
      });

  const unpaid = relevant.filter(p => p.status !== 'paid');
  const overdue = unpaid.filter(p => p.due_date && new Date(p.due_date) < new Date());
  const totalOutstanding = unpaid.reduce((s, p) => s + (p.total_amount - (p.amount_paid || 0)), 0);

  // Count unique members with outstanding payments
  const memberIdsWithDebt = new Set();
  unpaid.forEach(p => (p.member_ids || []).forEach(id => memberIdsWithDebt.add(id)));

  if (unpaid.length === 0) return null;

  const goToUnpaid = () => navigate('/payments?filter=unpaid');
  const goToOverdue = () => navigate('/payments?filter=overdue');

  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm font-semibold text-destructive">Problemer som krever handling</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={goToUnpaid}
          className="flex flex-col items-start p-3 bg-background rounded-lg border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-all text-left"
        >
          <Users className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-xl font-bold text-foreground">{memberIdsWithDebt.size}</span>
          <span className="text-xs text-muted-foreground">Spillere skylder</span>
        </button>
        <button
          onClick={goToUnpaid}
          className="flex flex-col items-start p-3 bg-background rounded-lg border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-all text-left"
        >
          <TrendingDown className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-xl font-bold text-destructive">{formatNOK(totalOutstanding)}</span>
          <span className="text-xs text-muted-foreground">Utestående totalt</span>
        </button>
        <button
          onClick={goToOverdue}
          className="flex flex-col items-start p-3 bg-background rounded-lg border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-all text-left"
        >
          <Clock className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-xl font-bold text-orange-600">{overdue.length}</span>
          <span className="text-xs text-muted-foreground">Forfalte krav</span>
        </button>
      </div>
    </div>
  );
}