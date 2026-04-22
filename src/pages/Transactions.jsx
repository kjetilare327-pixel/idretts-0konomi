import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNOK, formatDate, CATEGORIES } from '@/lib/utils';
import TransactionForm from '@/components/transactions/TransactionForm';
import { toast } from 'sonner';

export default function Transactions() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [showForm, setShowForm] = useState(params.get('action') === 'add');
  const [initialType, setInitialType] = useState(params.get('type') || 'income');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      toast.success('Transaksjon registrert');
    },
  });

  const filtered = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transaksjoner</h1>
          <p className="text-sm text-muted-foreground mt-1">Alle inntekter og utgifter</p>
        </div>
        <Button onClick={() => { setInitialType('income'); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Ny transaksjon
        </Button>
      </div>

      {showForm && (
        <TransactionForm
          initialType={initialType}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-xs font-medium text-green-700">Inntekter</p>
          <p className="text-lg font-bold text-green-800 mt-1">{formatNOK(totalIncome)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-xs font-medium text-red-700">Utgifter</p>
          <p className="text-lg font-bold text-red-800 mt-1">{formatNOK(totalExpenses)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs font-medium text-blue-700">Resultat</p>
          <p className="text-lg font-bold text-blue-800 mt-1">{formatNOK(totalIncome - totalExpenses)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Søk i beskrivelse..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle typer</SelectItem>
            <SelectItem value="income">Inntekter</SelectItem>
            <SelectItem value="expense">Utgifter</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kategorier</SelectItem>
            {Object.entries(CATEGORIES).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Laster...</div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-14 px-6 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ArrowUpRight className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Ingen transaksjoner ennå</p>
              <p className="text-sm text-muted-foreground mt-1">Registrer din første inntekt eller utgift for å komme i gang.</p>
            </div>
            <Button onClick={() => { setInitialType('income'); setShowForm(true); }} size="lg" className="mt-1">
              <Plus className="w-4 h-4 mr-2" /> Registrer første transaksjon
            </Button>
            <button
              onClick={() => { setInitialType('income'); setShowForm(true); }}
              className="text-sm text-primary underline-offset-4 hover:underline flex items-center gap-1"
            >
              <Filter className="w-3.5 h-3.5" />
              Eller beskriv med tekst: «2000 kr mat til 5 spillere»
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Ingen transaksjoner funnet</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {t.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description || CATEGORIES[t.category]?.label || 'Transaksjon'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      {t.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{CATEGORIES[t.category]?.label}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatNOK(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}