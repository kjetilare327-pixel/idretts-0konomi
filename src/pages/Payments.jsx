import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Send, Check, Search, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { formatNOK, formatDate, STATUS_CONFIG, PAYMENT_CATEGORIES } from '@/lib/utils';
import PaymentForm from '@/components/payments/PaymentForm';
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog';
import { toast } from 'sonner';

export default function Payments() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [showForm, setShowForm] = useState(params.get('action') === 'add');
  const [statusFilter, setStatusFilter] = useState(params.get('filter') === 'overdue' ? 'overdue' : params.get('filter') === 'unpaid' ? 'unpaid' : 'all');
  const [search, setSearch] = useState('');
  const [recordPayment, setRecordPayment] = useState(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-created_date', 500),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentRequirement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowForm(false);
      toast.success('Betalingskrav opprettet');
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PaymentRecord.create(data);
      const payment = payments.find(p => p.id === data.payment_requirement_id);
      const newAmountPaid = (payment.amount_paid || 0) + data.amount;
      const newStatus = newAmountPaid >= payment.total_amount ? 'paid' : 'partial';
      await base44.entities.PaymentRequirement.update(payment.id, {
        amount_paid: newAmountPaid,
        status: newStatus,
      });
      await base44.entities.Transaction.create({
        club_id: data.club_id,
        type: 'income',
        amount: data.amount,
        category: payment.category || 'membership_fees',
        description: `Betaling: ${payment.title}`,
        date: data.date,
        payment_requirement_id: payment.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setRecordPayment(null);
      toast.success('Betaling registrert');
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (payment) => {
      if (payment.parent_email) {
        await base44.integrations.Core.SendEmail({
          to: payment.parent_email,
          subject: `Påminnelse: ${payment.title}`,
          body: `Hei!\n\nDette er en påminnelse om ubetalt krav: ${payment.title}\nBeløp: kr ${(payment.total_amount - (payment.amount_paid || 0)).toLocaleString('nb-NO')}\nFrist: ${payment.due_date}\n\nVennligst betal snarest.\n\nMvh,\nKlubbFinans`,
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

  const filtered = payments.filter(p => {
    if (statusFilter === 'unpaid' && p.status === 'paid') return false;
    if (statusFilter !== 'all' && statusFilter !== 'unpaid' && p.status !== statusFilter) return false;
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase()) && !p.parent_email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Betalinger</h1>
          <p className="text-sm text-muted-foreground mt-1">Administrer betalingskrav og innbetalinger</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nytt betalingskrav
        </Button>
      </div>

      {showForm && (
        <PaymentForm
          members={members}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Søk etter tittel eller e-post..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            <SelectItem value="unpaid">Ubetalte</SelectItem>
            <SelectItem value="pending">Venter</SelectItem>
            <SelectItem value="partial">Delvis betalt</SelectItem>
            <SelectItem value="paid">Betalt</SelectItem>
            <SelectItem value="overdue">Forfalt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Laster...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Ingen betalingskrav funnet</p>
          </div>
        ) : (
          filtered.map((p) => {
            const status = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
            const remaining = p.total_amount - (p.amount_paid || 0);
            const progress = p.total_amount > 0 ? ((p.amount_paid || 0) / p.total_amount) * 100 : 0;
            return (
              <div key={p.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold">{p.title}</h4>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.colorClass}`}>{status.label}</Badge>
                      {p.category && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{PAYMENT_CATEGORIES[p.category]}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>Forfaller {formatDate(p.due_date)}</span>
                      {p.parent_email && <span>• {p.parent_email}</span>}
                      {p.reminder_count > 0 && <span>• {p.reminder_count} påminnelse(r) sendt</span>}
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <Progress value={progress} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatNOK(p.amount_paid || 0)} / {formatNOK(p.total_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-base font-bold whitespace-nowrap">{formatNOK(remaining)}</span>
                    {p.status !== 'paid' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => sendReminderMutation.mutate(p)} title="Send påminnelse">
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" onClick={() => setRecordPayment(p)} title="Registrer betaling">
                          <Check className="w-3.5 h-3.5 mr-1" /> Betal
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <RecordPaymentDialog
        payment={recordPayment}
        open={!!recordPayment}
        onClose={() => setRecordPayment(null)}
        onSubmit={(data) => recordPaymentMutation.mutate(data)}
      />
    </div>
  );
}