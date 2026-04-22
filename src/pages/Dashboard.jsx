import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatNOK } from '@/lib/utils';
import StatCard from '@/components/dashboard/StatCard';
import QuickActions from '@/components/dashboard/QuickActions';
import UnpaidWidget from '@/components/dashboard/UnpaidWidget';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import AiInsightsWidget from '@/components/dashboard/AiInsightsWidget';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { toast } from 'sonner';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 200),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-due_date', 200),
  });

  const ytdTransactions = transactions.filter(t => new Date(t.date).getFullYear() === currentYear);
  const totalIncome = ytdTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = ytdTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;
  const unpaidPayments = payments.filter(p => p.status !== 'paid');
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
      const daysOverdue = payment.due_date
        ? Math.floor((Date.now() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const remaining = payment.total_amount - (payment.amount_paid || 0);
      let tone = 'vennlig og profesjonell';
      if (daysOverdue > 14) tone = 'tydelig krav om betaling, men høflig';
      else if (daysOverdue > 7) tone = 'bestemt og profesjonell';

      if (payment.parent_email) {
        const aiRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Du er en profesjonell klubbadministrator. Skriv en kort betalingspåminnelse på norsk.\n\nKrav: ${payment.title}\nBeløp: kr ${remaining.toLocaleString('nb-NO')}\nForfallsdato: ${payment.due_date}\nDager siden forfall: ${daysOverdue > 0 ? daysOverdue : 'ikke forfalt ennå'}\nTone: ${tone}\n\nMaks 4 setninger. Avslutt med "Mvh, KlubbFinans". Ingen HTML.`,
        });
        await base44.integrations.Core.SendEmail({
          to: payment.parent_email,
          subject: `Påminnelse: ${payment.title}`,
          body: aiRes,
        });
      }
      await base44.entities.PaymentRequirement.update(payment.id, {
        reminder_count: (payment.reminder_count || 0) + 1,
        last_reminder_date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Påminnelse sendt');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Oversikt over klubbens økonomi</p>
      </div>

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
          <RecentActivity transactions={transactions.slice(0, 5)} />
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