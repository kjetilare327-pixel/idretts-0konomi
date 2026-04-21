import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, BarChart3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatNOK, CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';

export default function Budget() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', budgeted_amount: '', type: 'expense', description: '' });

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['budgetLines'],
    queryFn: () => base44.entities.BudgetLine.list('-created_date', 200),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetLine.create({ ...data, budgeted_amount: parseFloat(data.budgeted_amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetLines'] });
      setShowForm(false);
      setForm({ category: '', budgeted_amount: '', type: 'expense', description: '' });
      toast.success('Budsjettlinje lagt til');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetLine.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetLines'] });
      toast.success('Budsjettlinje slettet');
    },
  });

  const getActual = (category, type) => {
    return transactions.filter(t => t.category === category && t.type === type).reduce((s, t) => s + (t.amount || 0), 0);
  };

  const totalBudgetedIncome = budgetLines.filter(b => b.type === 'income').reduce((s, b) => s + (b.budgeted_amount || 0), 0);
  const totalBudgetedExpense = budgetLines.filter(b => b.type === 'expense').reduce((s, b) => s + (b.budgeted_amount || 0), 0);
  const totalActualIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalActualExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  const filteredCategories = Object.entries(CATEGORIES).filter(([, v]) => v.type === form.type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Budsjett</h1>
          <p className="text-sm text-muted-foreground mt-1">Planlegg og følg opp budsjettet</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ny budsjettlinje
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Budsjettert inntekt</p>
          <p className="text-lg font-bold mt-1">{formatNOK(totalBudgetedIncome)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Faktisk inntekt</p>
          <p className="text-lg font-bold mt-1 text-green-600">{formatNOK(totalActualIncome)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Budsjettert utgift</p>
          <p className="text-lg font-bold mt-1">{formatNOK(totalBudgetedExpense)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Faktisk utgift</p>
          <p className="text-lg font-bold mt-1 text-red-600">{formatNOK(totalActualExpense)}</p>
        </div>
      </div>

      {/* Budget Lines */}
      {budgetLines.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Ingen budsjettlinjer opprettet ennå</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgetLines.map((b) => {
            const actual = getActual(b.category, b.type);
            const pct = b.budgeted_amount > 0 ? (actual / b.budgeted_amount) * 100 : 0;
            const variance = actual - b.budgeted_amount;
            const isOver = b.type === 'expense' ? variance > 0 : variance < 0;
            return (
              <div key={b.id} className="bg-card rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{CATEGORIES[b.category]?.label || b.category}</h4>
                    <Badge variant={b.type === 'income' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {b.type === 'income' ? 'Inntekt' : 'Utgift'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                      {variance >= 0 ? '+' : ''}{formatNOK(variance)}
                    </span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(b.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={Math.min(pct, 100)} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatNOK(actual)} / {formatNOK(b.budgeted_amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ny budsjettlinje</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Inntekt</SelectItem>
                  <SelectItem value="expense">Utgift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Velg kategori" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budsjettert beløp (NOK)</Label>
              <Input type="number" min="0" step="0.01" value={form.budgeted_amount} onChange={(e) => setForm({ ...form, budgeted_amount: e.target.value })} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
              <Button type="submit">Legg til</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}