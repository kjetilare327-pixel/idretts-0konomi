import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, RefreshCw, Pause, Play, StopCircle, Users, CalendarClock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNOK, formatDate, PAYMENT_CATEGORIES } from '@/lib/utils';
import RecurringPaymentForm from '@/components/recurring/RecurringPaymentForm';
import { toast } from 'sonner';

const FREQUENCY_LABELS = {
  annual: 'Årlig',
  biannual: 'Halvårlig',
  quarterly: 'Kvartalsvis',
  monthly: 'Månedlig',
};

const STATUS_CONFIG = {
  active: { label: 'Aktiv', className: 'bg-green-50 text-green-700 border-green-200' },
  paused: { label: 'Pauset', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  ended:  { label: 'Avsluttet', className: 'bg-muted text-muted-foreground border-border' },
};

export default function RecurringPayments() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];

  const { data: recurringList = [], isLoading } = useQuery({
    queryKey: ['recurring-payments', club?.id],
    queryFn: () => base44.entities.RecurringPayment.filter({ club_id: club.id }, '-created_date', 100),
    enabled: !!club?.id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RecurringPayment.create({ ...data, club_id: club.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
      setShowForm(false);
      toast.success('Automatisk kontingent opprettet');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RecurringPayment.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
      toast.success('Status oppdatert');
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async (rp) => {
      const today = new Date().toISOString().split('T')[0];
      for (const memberId of (rp.member_ids || [])) {
        await base44.entities.PaymentRequirement.create({
          club_id: rp.club_id,
          title: rp.title,
          description: rp.description || '',
          total_amount: rp.amount,
          amount_paid: 0,
          status: 'pending',
          due_date: rp.next_due_date,
          category: rp.category || 'membership_fees',
          member_ids: [memberId],
        });
      }
      const next = advanceDate(rp.next_due_date, rp.frequency);
      await base44.entities.RecurringPayment.update(rp.id, {
        last_run_date: today,
        next_due_date: next,
        reminder_sent: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Betalingskrav opprettet for alle valgte medlemmer');
    },
  });

  const getMemberName = (id) => members.find(m => m.id === id)?.full_name || id;

  const activeList = recurringList.filter(r => r.status !== 'ended');
  const totalUpcoming = activeList.reduce((s, r) => s + (r.amount || 0) * (r.member_ids?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Automatisk kontingent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeList.length} aktive ordninger · Totalt {formatNOK(totalUpcoming)} per periode
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Opprett ny automatisk kontingent
        </Button>
      </div>

      {showForm && (
        <RecurringPaymentForm
          members={members.filter(m => m.status !== 'inactive')}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Empty state */}
      {!isLoading && recurringList.length === 0 && !showForm && (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center py-16 px-6 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CalendarClock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Ingen automatiske kontingenter ennå</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sett opp automatisk kontingent for å slippe å opprette betalingskrav manuelt hvert år.
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Opprett din første kontingent
          </Button>
        </div>
      )}

      {/* Recurring payment cards */}
      <div className="space-y-3">
        {recurringList.map((rp) => {
          const status = STATUS_CONFIG[rp.status] || STATUS_CONFIG.active;
          const memberCount = rp.member_ids?.length || 0;
          const periodTotal = rp.amount * memberCount;
          const daysUntilDue = rp.next_due_date
            ? Math.ceil((new Date(rp.next_due_date) - new Date()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <div key={rp.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{rp.title}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.className}`}>{status.label}</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{FREQUENCY_LABELS[rp.frequency]}</Badge>
                    {rp.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{PAYMENT_CATEGORIES[rp.category] || rp.category}</Badge>}
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {memberCount} medlemmer
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Neste forfall: {formatDate(rp.next_due_date)}
                      {daysUntilDue !== null && (
                        <span className={daysUntilDue <= 7 ? 'text-warning font-medium' : ''}>
                          {daysUntilDue > 0 ? ` (om ${daysUntilDue} dager)` : ' (i dag!)'}
                        </span>
                      )}
                    </span>
                    {rp.last_run_date && <span>Sist kjørt: {formatDate(rp.last_run_date)}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-base font-bold">{formatNOK(rp.amount)}</p>
                    <p className="text-xs text-muted-foreground">× {memberCount} = {formatNOK(periodTotal)}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    {rp.status === 'active' && (
                      <>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8"
                          title="Kjør nå"
                          onClick={() => { if (confirm(`Opprett betalingskrav for ${memberCount} medlemmer nå?`)) runNowMutation.mutate(rp); }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8 text-yellow-600"
                          title="Sett på pause"
                          onClick={() => updateStatusMutation.mutate({ id: rp.id, status: 'paused' })}
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {rp.status === 'paused' && (
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8 text-green-600"
                        title="Aktiver"
                        onClick={() => updateStatusMutation.mutate({ id: rp.id, status: 'active' })}
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {rp.status !== 'ended' && (
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        title="Avslutt"
                        onClick={() => { if (confirm('Avslutte denne kontingenten?')) updateStatusMutation.mutate({ id: rp.id, status: 'ended' }); }}
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Member preview */}
              {memberCount > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1">
                  {(rp.member_ids || []).slice(0, 8).map(id => (
                    <span key={id} className="text-xs bg-muted rounded-md px-2 py-0.5 text-muted-foreground">{getMemberName(id)}</span>
                  ))}
                  {memberCount > 8 && (
                    <span className="text-xs bg-muted rounded-md px-2 py-0.5 text-muted-foreground">+{memberCount - 8} til</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function advanceDate(dateStr, frequency) {
  const d = new Date(dateStr);
  switch (frequency) {
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'biannual':  d.setMonth(d.getMonth() + 6); break;
    case 'annual':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}