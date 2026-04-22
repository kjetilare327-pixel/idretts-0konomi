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
  const unpaidTotal = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + (p.total_amount - (p.amount_paid || 0)), 0);

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
        <StatCard title="Inntekter i år" value={formatNOK(totalIncome)} icon={TrendingUp} variant="success" />
        <StatCard title="Utgifter i år" value={formatNOK(totalExpenses)} icon={TrendingDown} variant="danger" />
        <StatCard title="Utestående" value={formatNOK(unpaidTotal)} icon={AlertTriangle} variant="warning" subtitle={`${payments.filter(p => p.status !== 'paid').length} krav`} />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main content grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <IncomeExpenseChart transactions={ytdTransactions} />
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
          />
        </div>
      </div>
    </div>
  );
}