import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Eye, Lock, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatNOK, CATEGORIES } from '@/lib/utils';

// Public-facing financial summary — no personal data, only totals
export default function Transparens() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000),
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.list('-created_date', 1),
  });

  const club = clubs[0];
  const currentYear = new Date().getFullYear();

  const ytd = transactions.filter(t => t.date?.startsWith(currentYear.toString()));
  const totalIncome = ytd.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = ytd.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const result = totalIncome - totalExpense;

  const incomeByCategory = {};
  const expenseByCategory = {};
  ytd.forEach(t => {
    const cat = CATEGORIES[t.category]?.label || 'Annet';
    if (t.type === 'income') incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
    else expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
  });

  const maxIncome = Math.max(...Object.values(incomeByCategory), 1);
  const maxExpense = Math.max(...Object.values(expenseByCategory), 1);

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground">Laster...</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <span className="text-primary-foreground font-bold text-xl">KF</span>
        </div>
        <h1 className="text-2xl font-bold">{club?.name || 'Klubbøkonomi'}</h1>
        <p className="text-muted-foreground mt-1">Åpen regnskapsrapport — {currentYear}</p>
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <Eye className="w-3.5 h-3.5" />
          <span>Kun aggregerte tall vises — ingen personopplysninger</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4 text-center">
          <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Inntekter</p>
          <p className="text-base font-bold text-green-600 mt-0.5">{formatNOK(totalIncome)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Utgifter</p>
          <p className="text-base font-bold text-red-600 mt-0.5">{formatNOK(totalExpense)}</p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${result >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <Wallet className={`w-5 h-5 mx-auto mb-1 ${result >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          <p className="text-xs text-muted-foreground">Resultat</p>
          <p className={`text-base font-bold mt-0.5 ${result >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNOK(result)}</p>
        </div>
      </div>

      {/* Income breakdown */}
      {Object.keys(incomeByCategory).length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-sm">Inntekter etter kategori</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(incomeByCategory).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-medium">{formatNOK(amount)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(amount / maxIncome) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense breakdown */}
      {Object.keys(expenseByCategory).length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <h3 className="font-semibold text-sm">Utgifter etter kategori</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-medium">{formatNOK(amount)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${(amount / maxExpense) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-4 border-t border-border">
        <Lock className="w-3.5 h-3.5" />
        <span>Drevet av KlubbFinans — kun offentlige aggregerte tall vises her</span>
      </div>
    </div>
  );
}