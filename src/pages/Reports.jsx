import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { formatNOK, CATEGORIES } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ExportButtons from '@/components/reports/ExportButtons';
import AccountingExportDialog from '@/components/reports/AccountingExportDialog';

export default function Reports() {
  const [showAccountingExport, setShowAccountingExport] = useState(false);
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-created_date', 500),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  // P&L
  const incomeByCategory = {};
  const expenseByCategory = {};

  transactions.forEach(t => {
    const cat = CATEGORIES[t.category]?.label || t.category || 'Ukjent';
    if (t.type === 'income') {
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (t.amount || 0);
    } else {
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (t.amount || 0);
    }
  });

  const totalIncome = Object.values(incomeByCategory).reduce((s, v) => s + v, 0);
  const totalExpense = Object.values(expenseByCategory).reduce((s, v) => s + v, 0);
  const result = totalIncome - totalExpense;

  const hasData = transactions.length > 0;

  return (
    <div className="space-y-6">
      <AccountingExportDialog open={showAccountingExport} onClose={() => setShowAccountingExport(false)} transactions={transactions} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rapporter</h1>
          <p className="text-sm text-muted-foreground mt-1">Resultatregnskap og eksport</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowAccountingExport(true)}>
            <Building2 className="w-4 h-4 mr-2" /> Eksporter til regnskapssystem
          </Button>
          <ExportButtons transactions={transactions} payments={payments} members={members} />
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center py-16 px-6 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Ingen data å rapportere ennå</p>
            <p className="text-sm text-muted-foreground mt-1">Når du har registrert transaksjoner vil du se resultatregnskap og eksportmuligheter her.</p>
          </div>
          <a href="/transactions?action=add" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <TrendingUp className="w-4 h-4" /> Registrer din første transaksjon
          </a>
        </div>
      )}

      {/* P&L */}
      {hasData && <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">Resultatregnskap</h3>
        </div>

        {/* Income */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-semibold text-green-700">Inntekter</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(incomeByCategory).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">{cat}</span>
                <span className="text-sm font-medium">{formatNOK(amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-semibold">Sum inntekter</span>
              <span className="text-sm font-bold text-green-600">{formatNOK(totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <h4 className="text-sm font-semibold text-red-700">Utgifter</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(expenseByCategory).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">{cat}</span>
                <span className="text-sm font-medium">{formatNOK(amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-semibold">Sum utgifter</span>
              <span className="text-sm font-bold text-red-600">{formatNOK(totalExpense)}</span>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="p-5 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">Resultat</span>
            <span className={`text-xl font-bold ${result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatNOK(result)}
            </span>
          </div>
        </div>
      </div>}
    </div>
  );
}