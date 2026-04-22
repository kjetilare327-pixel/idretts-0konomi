import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatNOK } from '@/lib/utils';
import StatCard from '@/components/dashboard/StatCard';
import QuickActions from '@/components/dashboard/QuickActions';
import UnpaidWidget from '@/components/dashboard/UnpaidWidget';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import AiInsightsWidget from '@/components/dashboard/AiInsightsWidget';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TeamFilter from '@/components/dashboard/TeamFilter';
import ProblemBox from '@/components/dashboard/ProblemBox';
import { toast } from 'sonner';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [teamFilter, setTeamFilter] = useState('all');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 200),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-due_date', 200),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  // Extract unique teams
  const teams = useMemo(() => {
    const t = new Set(members.map(m => m.team).filter(Boolean));
    return Array.from(t).sort();
  }, [members]);

  // Filter transactions by team (via member link)
  const teamMemberIds = useMemo(() => {
    if (teamFilter === 'all') return null;
    return new Set(members.filter(m => m.team === teamFilter).map(m => m.id));
  }, [teamFilter, members]);

  const filteredTransactions = useMemo(() => {
    if (teamFilter === 'all') return transactions;
    return transactions.filter(t => t.member_id && teamMemberIds?.has(t.member_id));
  }, [transactions, teamFilter, teamMemberIds]);

  const filteredPayments = useMemo(() => {
    if (teamFilter === 'all') return payments;
    return payments.filter(p => (p.member_ids || []).some(id => teamMemberIds?.has(id)));
  }, [payments, teamFilter, teamMemberIds]);

  const ytdTransactions = filteredTransactions.filter(t => new Date(t.date).getFullYear() === currentYear);
  const totalIncome = ytdTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = ytdTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;
  const unpaidPayments = filteredPayments.filter(p => p.status !== 'paid');
  const unpaidTotal = unpaidPayments.reduce((s, p) => s + (p.total_amount - (p.amount_paid || 0)), 0);
  const overdueCount = unpaidPayments.filter(p => p.due_date && new Date(p.due_date) < new Date()).length;

  // Trends: compare to previous month
  const now = new Date();
  const thisMonth = now.getMonth();
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const prevYear = thisMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
  });
  const thisMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === currentYear && d.getMonth() === thisMonth;
  });
  const calcTrend = (curr, prev) => prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

  const thisMonthIncome = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevMonthIncome = prevMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const thisMonthExpense = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevMonthExpense = prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const incomeTrend = calcTrend(thisMonthIncome, prevMonthIncome);
  const expenseTrend = calcTrend(thisMonthExpense, prevMonthExpense);

  const markPaidMutation = useMutation({
    mutationFn: async (payment) => {
      await base44.entities.PaymentRequirement.update(payment.id, {
        status: 'paid',
        amount_paid: payment.total_amount,
      });
      await base44.entities.Transaction.create({
        club_id: payment.club_id,
        season_id: payment.season_id,
        type: 'income',
        amount: payment.total_amount - (payment.amount_paid || 0),
        category: payment.category || 'membership_fees',
        description: `Betaling: ${payment.title}`,
        date: new Date().toISOString().split('T')[0],
        payment_requirement_id: payment.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Betaling registrert');
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (payment) => {
      await base44.entities.PaymentRequirement.update(payment.id, {
        reminder_count: (payment.reminder_count || 0) + 1,
        last_reminder_date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Påminnelse registrert i appen');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Oversikt over klubbens økonomi</p>
        </div>
        {teams.length > 0 && (
          <TeamFilter teams={teams} value={teamFilter} onChange={setTeamFilter} />
        )}
      </div>

      {/* Problem box */}
      <ProblemBox payments={payments} members={members} teamFilter={teamFilter} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo" value={formatNOK(balance)} icon={Wallet} variant={balance >= 0 ? 'success' : 'danger'} />
        <StatCard title="Inntekter i år" value={formatNOK(totalIncome)} icon={TrendingUp} variant="success"
          trend={incomeTrend !== null ? { value: incomeTrend, label: 'vs. forrige mnd' } : undefined} />
        <StatCard title="Utgifter i år" value={formatNOK(totalExpenses)} icon={TrendingDown} variant="danger"
          trend={expenseTrend !== null ? { value: expenseTrend, label: 'vs. forrige mnd' } : undefined} />
        <StatCard title="Utestående" value={formatNOK(unpaidTotal)} icon={AlertTriangle} variant="warning"
          subtitle={`${unpaidPayments.length} krav${overdueCount > 0 ? ` · ${overdueCount} forfalt` : ''}`} />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main content grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <IncomeExpenseChart transactions={ytdTransactions} />
          <RecentActivity transactions={filteredTransactions.slice(0, 5)} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <UnpaidWidget
            payments={payments}
            onMarkPaid={(p) => markPaidMutation.mutate(p)}
            onSendReminder={(p) => sendReminderMutation.mutate(p)}
          />
          <AiInsightsWidget
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            unpaidTotal={unpaidTotal}
            unpaidCount={unpaidPayments.length}
            overdueCount={overdueCount}
          />
        </div>
      </div>
    </div>
  );
}