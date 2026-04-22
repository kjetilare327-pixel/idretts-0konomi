import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Bell, CheckCircle, Clock, RefreshCw, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

export default function Automation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];

  const { data: settingsList = [] } = useQuery({
    queryKey: ['automation-settings', club?.id],
    queryFn: () => base44.entities.AutomationSettings.filter({ club_id: club.id }),
    enabled: !!club?.id,
  });
  const settings = settingsList[0];

  const [enabled, setEnabled] = useState(false);
  const [firstDays, setFirstDays] = useState('7');
  const [repeatDays, setRepeatDays] = useState('7');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.auto_reminder_enabled || false);
      setFirstDays(String(settings.first_reminder_days || 7));
      setRepeatDays(String(settings.repeat_reminder_days || 7));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        return base44.entities.AutomationSettings.update(settings.id, data);
      } else {
        return base44.entities.AutomationSettings.create({ ...data, club_id: club.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-settings'] });
      toast.success('Automatisering lagret');
    },
  });

  // Run reminders manually
  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-due_date', 500),
  });

  const runRemindersMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const firstDaysNum = parseInt(firstDays);
      const repeatDaysNum = parseInt(repeatDays);
      let count = 0;

      const overdueUnpaid = payments.filter(p => {
        if (p.status === 'paid') return false;
        if (!p.due_date) return false;
        const due = new Date(p.due_date);
        const daysPast = Math.floor((today - due) / (1000 * 60 * 60 * 24));
        if (daysPast < firstDaysNum) return false;
        if (!p.last_reminder_date) return true;
        const lastReminder = new Date(p.last_reminder_date);
        const daysSince = Math.floor((today - lastReminder) / (1000 * 60 * 60 * 24));
        return daysSince >= repeatDaysNum;
      });

      for (const p of overdueUnpaid) {
        await base44.entities.PaymentRequirement.update(p.id, {
          reminder_count: (p.reminder_count || 0) + 1,
          last_reminder_date: today.toISOString().split('T')[0],
        });
        count++;
      }
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success(`${count} purringer registrert`);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      auto_reminder_enabled: enabled,
      first_reminder_days: parseInt(firstDays),
      repeat_reminder_days: parseInt(repeatDays),
    });
  };

  const overdueCount = payments.filter(p => p.status !== 'paid' && p.due_date && new Date(p.due_date) < new Date()).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Automatisering</h1>
        <p className="text-sm text-muted-foreground mt-1">Automatisk purring ved forfall – ingen manuell oppfølging</p>
      </div>

      {/* Status */}
      <div className={`rounded-xl border p-4 flex items-center gap-4 ${enabled ? 'bg-accent/5 border-accent/30' : 'bg-muted/30 border-border'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enabled ? 'bg-accent/20' : 'bg-muted'}`}>
          <Zap className={`w-5 h-5 ${enabled ? 'text-accent' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{enabled ? 'Automatisk purring er aktiv' : 'Automatisk purring er inaktiv'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabled ? `Purrer etter ${firstDays} dager, deretter hver ${repeatDays}. dag` : 'Aktiver for å starte automatisk oppfølging'}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Config */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Purreinnstillinger</h3>
        </div>

        <div className="space-y-1">
          <Label>Send første purring etter</Label>
          <Select value={firstDays} onValueChange={setFirstDays}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 dager etter forfall</SelectItem>
              <SelectItem value="7">7 dager etter forfall</SelectItem>
              <SelectItem value="14">14 dager etter forfall</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Gjenta purring hver</Label>
          <Select value={repeatDays} onValueChange={setRepeatDays}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7. dag</SelectItem>
              <SelectItem value="14">14. dag</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          Lagre innstillinger
        </Button>
      </div>

      {/* Manual run */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Kjør purringer nå</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Det er <span className="font-semibold text-foreground">{overdueCount}</span> forfalte ubetalte krav.
          Klikk for å registrere purringer på alle som kvalifiserer basert på innstillingene over.
        </p>
        <Button
          variant="outline"
          onClick={() => runRemindersMutation.mutate()}
          disabled={runRemindersMutation.isPending || overdueCount === 0}
        >
          <Bell className="w-4 h-4 mr-2" />
          {runRemindersMutation.isPending ? 'Kjører...' : 'Kjør purringer nå'}
        </Button>
      </div>

      {/* Recent reminders */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Nylig purret</h3>
        </div>
        <div className="space-y-2">
          {payments
            .filter(p => p.last_reminder_date && p.status !== 'paid')
            .sort((a, b) => new Date(b.last_reminder_date) - new Date(a.last_reminder_date))
            .slice(0, 5)
            .map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.parent_email || 'Ingen e-post'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Siste purring</p>
                  <p className="text-xs font-medium">{formatDate(p.last_reminder_date)}</p>
                  <p className="text-[10px] text-muted-foreground">{p.reminder_count} gang(er)</p>
                </div>
              </div>
            ))}
          {payments.filter(p => p.last_reminder_date && p.status !== 'paid').length === 0 && (
            <p className="text-sm text-muted-foreground">Ingen purringer sendt ennå</p>
          )}
        </div>
      </div>
    </div>
  );
}