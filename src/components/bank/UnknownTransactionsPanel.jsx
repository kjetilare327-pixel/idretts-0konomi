import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, EyeOff } from 'lucide-react';
import { formatNOK, formatDate, CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';

export default function UnknownTransactionsPanel({ transactions, members, clubId }) {
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState({});

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Transaksjon kategorisert');
    },
  });

  const handleCategorize = (tx) => {
    const sel = selections[tx.id] || {};
    updateMutation.mutate({
      id: tx.id,
      data: {
        status: 'matched',
        category: sel.category || 'other_income',
        member_id: sel.member_id || null,
      },
    });
    // Also create a real Transaction
    base44.entities.Transaction.create({
      club_id: clubId,
      type: tx.amount > 0 ? 'income' : 'expense',
      amount: Math.abs(tx.amount),
      category: sel.category || 'other_income',
      description: tx.description,
      date: tx.date,
      member_id: sel.member_id || undefined,
    });
  };

  const handleIgnore = (tx) => {
    updateMutation.mutate({ id: tx.id, data: { status: 'ignored' } });
  };

  const unmatched = transactions.filter(t => t.status === 'unmatched');

  if (unmatched.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Ukjente transaksjoner</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">Ingen ukjente transaksjoner — alt er kategorisert!</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-warning" />
          <h3 className="font-semibold">Ukjente transaksjoner</h3>
          <Badge variant="outline" className="text-warning border-warning/40 bg-warning/10">{unmatched.length}</Badge>
        </div>
      </div>
      <div className="divide-y divide-border">
        {unmatched.map(tx => (
          <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{formatNOK(tx.amount)}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{tx.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={selections[tx.id]?.category || ''}
                onValueChange={v => setSelections(s => ({ ...s, [tx.id]: { ...s[tx.id], category: v } }))}
              >
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Kategori" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selections[tx.id]?.member_id || ''}
                onValueChange={v => setSelections(s => ({ ...s, [tx.id]: { ...s[tx.id], member_id: v } }))}
              >
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Medlem" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={() => handleCategorize(tx)}>
                <Check className="w-3.5 h-3.5 mr-1" /> OK
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => handleIgnore(tx)}>
                <EyeOff className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}