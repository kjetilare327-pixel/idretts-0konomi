import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, CheckSquare, Square, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNOK, formatDate, CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';

const MVA_RATE = 0.25;

function downloadCSV(data, filename) {
  const headers = Object.keys(data[0]);
  const csv = [headers.join(';'), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function MvaKompensasjon() {
  const queryClient = useQueryClient();
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000),
  });

  const expenses = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (yearFilter && !t.date?.startsWith(yearFilter)) return false;
      return true;
    });
  }, [transactions, yearFilter]);

  const mvaExpenses = useMemo(() => expenses.filter(t => t.mva_eligible), [expenses]);

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map(t => t.id)));
    }
  };

  const markMvaMutation = useMutation({
    mutationFn: async (eligible) => {
      await Promise.all([...selectedIds].map(id =>
        base44.entities.Transaction.update(id, { mva_eligible: eligible })
      ));
    },
    onSuccess: (_, eligible) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());
      toast.success(eligible ? `${selectedIds.size} utgifter merket som MVA-berettiget` : 'MVA-merking fjernet');
    },
  });

  const totalMvaBase = mvaExpenses.reduce((s, t) => s + (t.amount || 0), 0);
  const estimatedCompensation = totalMvaBase * MVA_RATE;

  const availableYears = [...new Set(transactions.map(t => t.date?.substring(0, 4)).filter(Boolean))].sort().reverse();

  const exportReport = () => {
    if (mvaExpenses.length === 0) { toast.error('Ingen MVA-berettigede utgifter å eksportere'); return; }
    downloadCSV(mvaExpenses.map(t => ({
      Dato: t.date,
      Beskrivelse: t.description || CATEGORIES[t.category]?.label || '',
      Kategori: CATEGORIES[t.category]?.label || t.category || '',
      'Beløp inkl. MVA (kr)': t.amount,
      'MVA-grunnlag (kr)': (t.amount / (1 + MVA_RATE)).toFixed(2),
      'MVA-beløp (kr)': (t.amount - t.amount / (1 + MVA_RATE)).toFixed(2),
    })), `mva-kompensasjon-${yearFilter}.csv`);
    toast.success('Rapport eksportert');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">MVA-kompensasjon</h1>
          <p className="text-sm text-muted-foreground mt-1">Merk utgifter og generer rapport for MVA-søknaden</p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Eksporter rapport
        </Button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Om MVA-kompensasjon for idrettslag</p>
          <p>Idrettslag kan søke om kompensasjon for MVA på utgifter knyttet til frivillig aktivitet. Søknadsfristen er vanligvis <strong>1. september</strong> hvert år via <a href="https://www.lottstift.no" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Lottstift <ExternalLink className="w-3 h-3" /></a>. Merk relevante utgifter nedenfor og last ned rapporten.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">MVA-berettigede utgifter</p>
          <p className="text-lg font-bold mt-1">{formatNOK(totalMvaBase)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{mvaExpenses.length} poster</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">MVA-sats</p>
          <p className="text-lg font-bold mt-1">25%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Standard MVA</p>
        </div>
        <div className="bg-card rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-700">Estimert kompensasjon</p>
          <p className="text-lg font-bold mt-1 text-green-700">{formatNOK(estimatedCompensation)}</p>
          <p className="text-xs text-green-600 mt-0.5">Beregnet beløp</p>
        </div>
      </div>

      {/* Year filter + bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">Alle år</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {selectedIds.size > 0 && (
          <>
            <Button size="sm" onClick={() => markMvaMutation.mutate(true)} disabled={markMvaMutation.isPending}>
              Merk {selectedIds.size} som MVA-berettiget
            </Button>
            <Button size="sm" variant="outline" onClick={() => markMvaMutation.mutate(false)} disabled={markMvaMutation.isPending}>
              Fjern MVA-merking
            </Button>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{expenses.length} utgifter totalt</span>
      </div>

      {/* Expense list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 cursor-pointer hover:bg-muted/50"
          onClick={toggleAll}
        >
          {selectedIds.size === expenses.length && expenses.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Velg alle</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Laster...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Ingen utgifter for valgt år</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/30 ${selectedIds.has(t.id) ? 'bg-primary/5' : ''}`}
                onClick={() => toggleSelected(t.id)}
              >
                {selectedIds.has(t.id) ? (
                  <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{t.description || CATEGORIES[t.category]?.label || 'Utgift'}</p>
                    {t.mva_eligible && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">MVA ✓</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                    {t.category && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{CATEGORIES[t.category]?.label}</Badge>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">{formatNOK(t.amount)}</p>
                  {t.mva_eligible && (
                    <p className="text-xs text-green-600">MVA: {formatNOK(t.amount * MVA_RATE / (1 + MVA_RATE))}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}