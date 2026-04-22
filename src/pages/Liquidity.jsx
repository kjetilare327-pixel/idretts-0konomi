import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, X, TrendingUp, TrendingDown, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatNOK } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const LOW_BUFFER = 5000;

export default function Liquidity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [form, setForm] = useState({ month: '1', type: 'income', description: '', amount: '', category: '' });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];

  const { data: entries = [] } = useQuery({
    queryKey: ['liquidity', club?.id, year],
    queryFn: () => base44.entities.LiquidityEntry.filter({ club_id: club.id, year }),
    enabled: !!club?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LiquidityEntry.create({ ...data, club_id: club.id, year }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidity'] });
      setShowForm(false);
      setForm({ month: '1', type: 'income', description: '', amount: '', category: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LiquidityEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['liquidity'] }),
  });

  const monthlyData = useMemo(() => {
    let runningBalance = 0;
    return MONTHS.map((name, i) => {
      const month = i + 1;
      const monthEntries = entries.filter(e => e.month === month);
      const income = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
      const expense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
      const net = income - expense;
      runningBalance += net;
      return { name, month, income, expense, net, balance: runningBalance, entries: monthEntries };
    });
  }, [entries]);

  const chartData = monthlyData.map(m => ({ name: m.name, Saldo: m.balance }));

  const getMonthStatus = (m) => {
    if (m.balance < 0) return 'negative';
    if (m.balance < LOW_BUFFER) return 'low';
    return 'ok';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Likviditetsprognose</h1>
          <p className="text-sm text-muted-foreground mt-1">Planlegg fremtidige inntekter og utgifter per måned</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Legg til post
          </Button>
        </div>
      </div>

      {/* Saldo chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-sm mb-4">Saldo gjennom året</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatNOK(v)} />
            <Area type="monotone" dataKey="Saldo" stroke="hsl(var(--accent))" fill="url(#balGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {monthlyData.map((m) => {
          const status = getMonthStatus(m);
          return (
            <button
              key={m.month}
              onClick={() => setSelectedMonth(m)}
              className={`text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                status === 'negative'
                  ? 'border-destructive/40 bg-destructive/5'
                  : status === 'low'
                  ? 'border-warning/40 bg-warning/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{m.name}</span>
                {status === 'negative' && <XCircle className="w-4 h-4 text-destructive" />}
                {status === 'low' && <AlertTriangle className="w-4 h-4 text-warning" />}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Inn</span>
                  <span className="text-green-600 font-medium">{formatNOK(m.income)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Ut</span>
                  <span className="text-red-600 font-medium">{formatNOK(m.expense)}</span>
                </div>
                <div className={`flex justify-between text-xs font-bold pt-1 border-t border-border ${m.balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  <span>Saldo</span>
                  <span>{formatNOK(m.balance)}</span>
                </div>
              </div>
              {m.entries.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">{m.entries.length} poster</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Month detail dialog */}
      <Dialog open={!!selectedMonth} onOpenChange={() => setSelectedMonth(null)}>
        <DialogContent className="max-w-md">
          {selectedMonth && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedMonth.name} {year}
                  {getMonthStatus(selectedMonth) === 'negative' && (
                    <span className="text-xs font-normal text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Negativ saldo</span>
                  )}
                  {getMonthStatus(selectedMonth) === 'low' && (
                    <span className="text-xs font-normal text-warning bg-warning/10 px-2 py-0.5 rounded-full">Lav buffer</span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* Suggestions for negative months */}
                {getMonthStatus(selectedMonth) !== 'ok' && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Forslag til tiltak</p>
                    <a
                      href="/payments?action=add"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> Opprett betalingskrav
                    </a>
                    <a
                      href="/transactions?action=add&type=income"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> Registrer dugnadsintekter
                    </a>
                  </div>
                )}

                {/* Entries */}
                {selectedMonth.entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Ingen poster denne måneden</p>
                ) : (
                  <div className="divide-y divide-border">
                    {selectedMonth.entries.map(e => (
                      <div key={e.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium">{e.description || e.category || 'Post'}</p>
                          <p className="text-xs text-muted-foreground">{e.type === 'income' ? 'Inntekt' : 'Utgift'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {e.type === 'income' ? '+' : '-'}{formatNOK(e.amount)}
                          </span>
                          <button onClick={() => deleteMutation.mutate(e.id)} className="text-muted-foreground hover:text-destructive">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-border font-semibold text-sm">
                  <span>Netto denne måneden</span>
                  <span className={selectedMonth.net < 0 ? 'text-destructive' : 'text-green-600'}>{formatNOK(selectedMonth.net)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                  <span>Akkumulert saldo</span>
                  <span className={selectedMonth.balance < 0 ? 'text-destructive' : 'text-foreground'}>{formatNOK(selectedMonth.balance)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setForm({ ...form, month: String(selectedMonth.month) }); setSelectedMonth(null); setShowForm(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Legg til post for {selectedMonth.name}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add entry form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Legg til planlagt post</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, month: parseInt(form.month), amount: parseFloat(form.amount) }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Måned</Label>
                <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Inntekt</SelectItem>
                    <SelectItem value="expense">Utgift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Input placeholder="f.eks. Cupavgift NM" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Beløp (NOK) *</Label>
              <Input type="number" min="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
              <Button type="submit" disabled={createMutation.isPending}>Legg til</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}