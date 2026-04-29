import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Plus, Sparkles, Loader2, AlertTriangle, Download,
  BarChart3, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatNOK, CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';
import BudgetAlerts from '@/components/seasonbudget/BudgetAlerts';
import BudgetExportButtons from '@/components/seasonbudget/BudgetExportButtons';
import MembershipRevenueWidget from '@/components/seasonbudget/MembershipRevenueWidget';

const THRESHOLD_WARN = 85;
const THRESHOLD_OVER = 100;

export default function SeasonBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [showLineForm, setShowLineForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);

  const [newBudget, setNewBudget] = useState({ name: '', season_id: '', team_filter: '' });
  const [lineForm, setLineForm] = useState({ category: '', type: 'expense', budgeted_amount: '', description: '', team_filter: '', expected_member_count: '', rate_per_member: '' });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-year', 20),
  });

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['budgetLines'],
    queryFn: () => base44.entities.BudgetLine.list('-created_date', 500),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  // Active season selection
  const activeSeason = useMemo(() => {
    if (selectedSeasonId) return seasons.find(s => s.id === selectedSeasonId);
    return seasons.find(s => s.status === 'active') || seasons[0];
  }, [seasons, selectedSeasonId]);

  const currentSeasonId = activeSeason?.id;

  // Budget lines for current season
  const seasonBudgetLines = useMemo(() =>
    budgetLines.filter(b => b.season_id === currentSeasonId),
    [budgetLines, currentSeasonId]
  );

  // Transactions for current season
  const seasonTransactions = useMemo(() => {
    if (!activeSeason) return transactions;
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      const start = activeSeason.start_date ? new Date(activeSeason.start_date) : null;
      const end = activeSeason.end_date ? new Date(activeSeason.end_date) : null;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [transactions, activeSeason]);

  // Unique teams
  const teams = useMemo(() => {
    const t = new Set(members.map(m => m.team).filter(Boolean));
    return Array.from(t).sort();
  }, [members]);

  const getActual = (category, type) =>
    seasonTransactions.filter(t => t.category === category && t.type === type).reduce((s, t) => s + (t.amount || 0), 0);

  // Group by category
  const grouped = useMemo(() => {
    const map = {};
    seasonBudgetLines.forEach(b => {
      const key = `${b.type}__${b.category}`;
      if (!map[key]) map[key] = { ...b, lines: [] };
      map[key].lines.push(b);
    });
    return Object.values(map);
  }, [seasonBudgetLines]);

  // Alerts: categories where usage > THRESHOLD_WARN %
  const alerts = useMemo(() =>
    grouped
      .filter(g => g.type === 'expense')
      .map(g => {
        const budgeted = g.lines.reduce((s, l) => s + (l.budgeted_amount || 0), 0);
        const actual = getActual(g.category, 'expense');
        const pct = budgeted > 0 ? (actual / budgeted) * 100 : 0;
        return { ...g, budgeted, actual, pct };
      })
      .filter(g => g.pct >= THRESHOLD_WARN),
    [grouped, seasonTransactions]
  );

  // Membership fee budget line (for revenue widget)
  const membershipBudgetLine = useMemo(() =>
    seasonBudgetLines.find(b => b.type === 'income' && b.category === 'membership_fees' && (b.expected_member_count || b.rate_per_member)),
    [seasonBudgetLines]
  );
  const membershipActualIncome = useMemo(() =>
    seasonTransactions.filter(t => t.type === 'income' && t.category === 'membership_fees').reduce((s, t) => s + (t.amount || 0), 0),
    [seasonTransactions]
  );

  const totalBudgetedIncome = seasonBudgetLines.filter(b => b.type === 'income').reduce((s, b) => s + (b.budgeted_amount || 0), 0);
  const totalBudgetedExpense = seasonBudgetLines.filter(b => b.type === 'expense').reduce((s, b) => s + (b.budgeted_amount || 0), 0);
  const totalActualIncome = seasonTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalActualExpense = seasonTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  const createLineMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetLine.create({
      ...data,
      budgeted_amount: parseFloat(data.budgeted_amount),
      expected_member_count: data.expected_member_count ? parseInt(data.expected_member_count) : undefined,
      rate_per_member: data.rate_per_member ? parseFloat(data.rate_per_member) : undefined,
      club_id: club?.id,
      season_id: currentSeasonId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetLines'] });
      setShowLineForm(false);
      setLineForm({ category: '', type: 'expense', budgeted_amount: '', description: '', team_filter: '', expected_member_count: '', rate_per_member: '' });
      toast.success('Budsjettlinje lagt til');
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetLine.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetLines'] });
      toast.success('Slettet');
    },
  });

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setAiSuggestions('');
    const prevSeasonTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === (new Date().getFullYear() - 1);
    });
    const summary = Object.entries(CATEGORIES).map(([key, val]) => {
      const actual = prevSeasonTx.filter(t => t.category === key).reduce((s, t) => s + t.amount, 0);
      return `${val.label}: ${formatNOK(actual)}`;
    }).join(', ');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du er en idrettsklubb-økonom. Faktiske tall fra forrige år per kategori: ${summary}.\nSesongen er: ${activeSeason?.name || 'ikke valgt'}.\nLag konkrete budsjettanbefalinger for neste sesong per kategori på norsk, med spesifikke beløp. Maks 6 anbefalinger. Vær konkret og begrunnet.`,
    });
    setAiSuggestions(result);
    setAiLoading(false);
  };

  const filteredCategories = Object.entries(CATEGORIES).filter(([, v]) => v.type === lineForm.type);

  const getBarColor = (pct, type) => {
    if (type === 'income') {
      if (pct >= 100) return 'bg-green-500';
      if (pct >= 50) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (pct >= THRESHOLD_OVER) return 'bg-red-500';
    if (pct >= THRESHOLD_WARN) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sesongbudsjett</h1>
          <p className="text-sm text-muted-foreground mt-1">Planlegg og følg opp budsjettet per sesong</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Season selector */}
          <Select value={activeSeason?.id || ''} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Velg sesong" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleAiSuggest} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI-forslag
          </Button>
          <BudgetExportButtons budgetLines={seasonBudgetLines} transactions={seasonTransactions} season={activeSeason} />
          <Button onClick={() => setShowLineForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Ny budsjettlinje
          </Button>
        </div>
      </div>

      {/* No season warning */}
      {!activeSeason && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Ingen sesonger funnet</p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Opprett en sesong under Sesonger for å komme i gang med sesongbudsjettet.</p>
        </div>
      )}

      {/* AI suggestions */}
      {aiSuggestions && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 flex gap-3">
          <Sparkles className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold mb-1">AI-anbefalinger for {activeSeason?.name}</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{aiSuggestions}</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && <BudgetAlerts alerts={alerts} />}

      {/* Membership revenue tracker */}
      {activeSeason && membershipBudgetLine && (
        <MembershipRevenueWidget
          budgetLine={membershipBudgetLine}
          actualIncome={membershipActualIncome}
          season={activeSeason}
        />
      )}

      {/* Summary cards */}
      {activeSeason && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Budsjettert inntekt</p>
            <p className="text-xl font-bold mt-1">{formatNOK(totalBudgetedIncome)}</p>
            <p className="text-xs text-green-600 mt-1">{formatNOK(totalActualIncome)} faktisk</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Budsjettert utgift</p>
            <p className="text-xl font-bold mt-1">{formatNOK(totalBudgetedExpense)}</p>
            <p className="text-xs text-red-600 mt-1">{formatNOK(totalActualExpense)} faktisk</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Budsjettert resultat</p>
            <p className={`text-xl font-bold mt-1 ${(totalBudgetedIncome - totalBudgetedExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatNOK(totalBudgetedIncome - totalBudgetedExpense)}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Faktisk resultat</p>
            <p className={`text-xl font-bold mt-1 ${(totalActualIncome - totalActualExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatNOK(totalActualIncome - totalActualExpense)}
            </p>
          </div>
        </div>
      )}

      {/* Budget lines */}
      {activeSeason && (
        <div className="space-y-4">
          {/* Income */}
          <Section
            title="Inntekter"
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            lines={seasonBudgetLines.filter(b => b.type === 'income')}
            transactions={seasonTransactions}
            type="income"
            getBarColor={getBarColor}
            onDelete={(id) => deleteLineMutation.mutate(id)}
          />
          {/* Expenses */}
          <Section
            title="Utgifter"
            icon={<TrendingDown className="w-4 h-4 text-red-600" />}
            lines={seasonBudgetLines.filter(b => b.type === 'expense')}
            transactions={seasonTransactions}
            type="expense"
            getBarColor={getBarColor}
            onDelete={(id) => deleteLineMutation.mutate(id)}
          />

          {seasonBudgetLines.length === 0 && (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Ingen budsjettlinjer for {activeSeason?.name}</p>
              <p className="text-sm mt-1">Legg til linjer eller bruk AI-forslag for å komme i gang.</p>
              <Button className="mt-4" onClick={() => setShowLineForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Legg til første linje
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add line dialog */}
      <Dialog open={showLineForm} onOpenChange={(o) => { if (!o) setShowLineForm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ny budsjettlinje – {activeSeason?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createLineMutation.mutate(lineForm); }} className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={lineForm.type} onValueChange={(v) => setLineForm({ ...lineForm, type: v, category: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Inntekt</SelectItem>
                  <SelectItem value="expense">Utgift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={lineForm.category} onValueChange={(v) => setLineForm({ ...lineForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="Velg kategori" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Membership fee helper fields */}
            {lineForm.type === 'income' && lineForm.category === 'membership_fees' && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kontingentberegning</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Antall medlemmer</Label>
                    <Input
                      type="number" min="0" placeholder="f.eks. 50"
                      value={lineForm.expected_member_count}
                      onChange={(e) => {
                        const count = e.target.value;
                        const rate = lineForm.rate_per_member;
                        const auto = count && rate ? String(Math.round(parseFloat(count) * parseFloat(rate))) : lineForm.budgeted_amount;
                        setLineForm({ ...lineForm, expected_member_count: count, budgeted_amount: auto });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Sats per medlem (NOK)</Label>
                    <Input
                      type="number" min="0" placeholder="f.eks. 1500"
                      value={lineForm.rate_per_member}
                      onChange={(e) => {
                        const rate = e.target.value;
                        const count = lineForm.expected_member_count;
                        const auto = count && rate ? String(Math.round(parseFloat(count) * parseFloat(rate))) : lineForm.budgeted_amount;
                        setLineForm({ ...lineForm, rate_per_member: rate, budgeted_amount: auto });
                      }}
                    />
                  </div>
                </div>
                {lineForm.expected_member_count && lineForm.rate_per_member && (
                  <p className="text-xs text-accent font-medium">
                    = {formatNOK(parseFloat(lineForm.expected_member_count) * parseFloat(lineForm.rate_per_member))} automatisk beregnet
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Budsjettert beløp (NOK)</Label>
              <Input type="number" min="0" step="1" value={lineForm.budgeted_amount}
                onChange={(e) => setLineForm({ ...lineForm, budgeted_amount: e.target.value })} required />
            </div>
            <div>
              <Label>Lag/gruppe (valgfritt)</Label>
              <Select value={lineForm.team_filter || '_all'} onValueChange={(v) => setLineForm({ ...lineForm, team_filter: v === '_all' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Alle lag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Alle lag</SelectItem>
                  {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beskrivelse (valgfritt)</Label>
              <Input value={lineForm.description} onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLineForm(false)}>Avbryt</Button>
              <Button type="submit" disabled={createLineMutation.isPending || !lineForm.category || !lineForm.budgeted_amount}>
                Legg til
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, icon, lines, transactions, type, getBarColor, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);

  const grouped = useMemo(() => {
    const map = {};
    lines.forEach(b => {
      if (!map[b.category]) map[b.category] = [];
      map[b.category].push(b);
    });
    return map;
  }, [lines]);

  if (lines.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary" className="text-xs">{lines.length} linjer</Badge>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="divide-y divide-border border-t border-border">
          {Object.entries(grouped).map(([category, catLines]) => {
            const budgeted = catLines.reduce((s, l) => s + (l.budgeted_amount || 0), 0);
            const actual = transactions.filter(t => t.category === category && t.type === type).reduce((s, t) => s + (t.amount || 0), 0);
            const pct = budgeted > 0 ? (actual / budgeted) * 100 : 0;
            const barColor = getBarColor(pct, type);
            const variance = type === 'expense' ? actual - budgeted : budgeted - actual;
            const isAlert = type === 'expense' && pct >= 85;

            return (
              <div key={category} className={`p-4 ${isAlert ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{CATEGORIES[category]?.label || category}</span>
                    {catLines[0]?.team_filter && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{catLines[0].team_filter}</Badge>
                    )}
                    {isAlert && pct >= 100 && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">Over budsjett!</Badge>
                    )}
                    {isAlert && pct < 100 && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700 border-yellow-200">Nær grensen</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {variance > 0 ? '+' : ''}{formatNOK(variance)}
                    </span>
                    <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                    {catLines.map(l => (
                      <button key={l.id} onClick={() => onDelete(l.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatNOK(actual)} / {formatNOK(budgeted)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}