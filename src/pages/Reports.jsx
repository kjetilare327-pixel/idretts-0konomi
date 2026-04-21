import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Download, FileSpreadsheet, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNOK, CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';

function downloadCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(';'), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-created_date', 500),
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

  const exportTransactions = () => {
    downloadCSV(transactions.map(t => ({
      Dato: t.date, Type: t.type === 'income' ? 'Inntekt' : 'Utgift',
      Beløp: t.amount, Kategori: CATEGORIES[t.category]?.label || t.category,
      Beskrivelse: t.description || '',
    })), 'transaksjoner.csv');
    toast.success('Eksportert til CSV');
  };

  const exportUnpaid = () => {
    const unpaid = payments.filter(p => p.status !== 'paid');
    downloadCSV(unpaid.map(p => ({
      Tittel: p.title, Beløp: p.total_amount, Betalt: p.amount_paid || 0,
      Gjenstående: p.total_amount - (p.amount_paid || 0), Forfallsdato: p.due_date,
      Status: p.status, Epost: p.parent_email || '',
    })), 'ubetalte_krav.csv');
    toast.success('Eksportert til CSV');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rapporter</h1>
          <p className="text-sm text-muted-foreground mt-1">Resultatregnskap og eksport</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportTransactions}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Eksporter transaksjoner
          </Button>
          <Button variant="outline" onClick={exportUnpaid}>
            <Download className="w-4 h-4 mr-2" /> Eksporter ubetalte
          </Button>
        </div>
      </div>

      {/* P&L */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
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
      </div>
    </div>
  );
}