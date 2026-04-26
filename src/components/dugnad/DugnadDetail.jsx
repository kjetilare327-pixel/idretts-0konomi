import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Users, TrendingUp, CheckCircle2, XCircle, Clock,
  Zap, Save, Plus, AlertTriangle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNOK, formatDate } from '@/lib/utils';
import ParticipantPicker from './ParticipantPicker';
import { toast } from 'sonner';

const PARTICIPANT_STATUS = {
  registered: { label: 'Påmeldt', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  attended: { label: 'Møtte opp', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  absent: { label: 'Fraværende', icon: XCircle, color: 'text-red-600 bg-red-50' },
  exempt: { label: 'Fritatt', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
};

export default function DugnadDetail({ dugnad, members, club, onBack }) {
  const queryClient = useQueryClient();
  const [actualIncome, setActualIncome] = useState(dugnad.actual_income?.toString() || '');
  const [distributeMode, setDistributeMode] = useState('equal');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState(dugnad.participant_ids || []);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const { data: participants = [] } = useQuery({
    queryKey: ['dugnad-participants', dugnad.id],
    queryFn: () => base44.entities.DugnadParticipant.filter({ dugnad_id: dugnad.id }),
  });

  const memberMap = useMemo(() => {
    const m = {};
    members.forEach(mem => { m[mem.id] = mem; });
    return m;
  }, [members]);

  const saveParticipantsMutation = useMutation({
    mutationFn: async (ids) => {
      // Remove participants not in new list
      const toRemove = participants.filter(p => !ids.includes(p.member_id));
      for (const p of toRemove) await base44.entities.DugnadParticipant.delete(p.id);
      // Add new participants
      const existingIds = participants.map(p => p.member_id);
      const toAdd = ids.filter(id => !existingIds.includes(id));
      for (const mid of toAdd) {
        await base44.entities.DugnadParticipant.create({
          dugnad_id: dugnad.id,
          member_id: mid,
          club_id: club.id,
          status: 'registered',
          income_share: 0,
        });
      }
      await base44.entities.Dugnad.update(dugnad.id, { participant_ids: ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dugnad-participants', dugnad.id] });
      queryClient.invalidateQueries({ queryKey: ['dugnader'] });
      setShowPicker(false);
      toast.success('Deltakere oppdatert');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DugnadParticipant.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dugnad-participants', dugnad.id] }),
  });

  const distributeIncomeMutation = useMutation({
    mutationFn: async () => {
      const income = parseFloat(actualIncome) || 0;
      const eligible = participants.filter(p => p.status !== 'exempt' && p.status !== 'absent');
      const share = eligible.length > 0 ? income / eligible.length : 0;

      for (const p of eligible) {
        await base44.entities.DugnadParticipant.update(p.id, { income_share: Math.round(share) });
      }
      await base44.entities.Dugnad.update(dugnad.id, {
        actual_income: income,
        income_distributed: true,
        status: 'completed',
      });
      // Create transaction
      await base44.entities.Transaction.create({
        club_id: club.id,
        type: 'income',
        amount: income,
        category: 'other_income',
        description: `Dugnad: ${dugnad.name}`,
        date: dugnad.date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dugnad-participants', dugnad.id] });
      queryClient.invalidateQueries({ queryKey: ['dugnader'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Inntekt fordelt og transaksjonen registrert!');
    },
  });

  const getAiSuggestion = async () => {
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du er økonomiassistent for et norsk idrettslag. Gi et kort, konkret råd (maks 3 setninger) basert på disse dugnadstallene:
Dugnad: "${dugnad.name}"
Dato: ${dugnad.date}
Estimert inntekt: ${dugnad.estimated_income} kr
Antall deltakere: ${participants.length}
Status: ${dugnad.status}

Gi praktiske tips om f.eks. timing, antall deltakere, eller inntektspotensial basert på typiske norske idrettslag.`,
      });
      setAiSuggestion(result);
    } catch {
      toast.error('Kunne ikke hente AI-forslag');
    }
    setAiLoading(false);
  };

  const attended = participants.filter(p => p.status === 'attended');
  const absent = participants.filter(p => p.status === 'absent');
  const exempt = participants.filter(p => p.status === 'exempt');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{dugnad.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(dugnad.date)}{dugnad.time && ` · kl. ${dugnad.time}`}{dugnad.location && ` · ${dugnad.location}`}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Estimert inntekt</p>
          <p className="text-xl font-bold mt-1">{formatNOK(dugnad.estimated_income || 0)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Faktisk inntekt</p>
          <p className="text-xl font-bold mt-1 text-accent">{formatNOK(dugnad.actual_income || 0)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Totalt deltakere</p>
          <p className="text-xl font-bold mt-1">{participants.length}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Møtte opp</p>
          <p className="text-xl font-bold mt-1 text-green-600">{attended.length}</p>
        </div>
      </div>

      {/* AI suggestion */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">AI-forslag</h3>
          </div>
          <Button size="sm" variant="outline" onClick={getAiSuggestion} disabled={aiLoading}>
            {aiLoading ? 'Analyserer...' : 'Få tips'}
          </Button>
        </div>
        {aiSuggestion ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{aiSuggestion}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Trykk «Få tips» for AI-baserte anbefalinger for denne dugnaden.</p>
        )}
      </div>

      {/* Participant management */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" /> Deltakere
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowPicker(!showPicker)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Legg til / endre
          </Button>
        </div>

        {showPicker && (
          <div className="mb-4 p-4 bg-muted/30 rounded-xl border border-border space-y-3">
            <ParticipantPicker
              members={members}
              selected={selectedIds}
              onChange={setSelectedIds}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowPicker(false)}>Avbryt</Button>
              <Button
                size="sm"
                onClick={() => saveParticipantsMutation.mutate(selectedIds)}
                disabled={saveParticipantsMutation.isPending}
              >
                <Save className="w-3.5 h-3.5 mr-1" /> Lagre deltakere
              </Button>
            </div>
          </div>
        )}

        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Ingen deltakere lagt til ennå.</p>
        ) : (
          <div className="divide-y divide-border">
            {participants.map(p => {
              const member = memberMap[p.member_id];
              const statusCfg = PARTICIPANT_STATUS[p.status] || PARTICIPANT_STATUS.registered;
              const Icon = statusCfg.icon;
              return (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {member?.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member?.full_name || 'Ukjent'}</p>
                    {member?.team && <p className="text-xs text-muted-foreground">{member.team}</p>}
                  </div>
                  {p.income_share > 0 && (
                    <span className="text-xs font-semibold text-accent">{formatNOK(p.income_share)}</span>
                  )}
                  <Select
                    value={p.status}
                    onValueChange={(v) => updateStatusMutation.mutate({ id: p.id, status: v })}
                  >
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered">Påmeldt</SelectItem>
                      <SelectItem value="attended">Møtte opp</SelectItem>
                      <SelectItem value="absent">Fraværende</SelectItem>
                      <SelectItem value="exempt">Fritatt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Income distribution */}
      {!dugnad.income_distributed && participants.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-muted-foreground" /> Fordel inntekt
          </h3>
          <div className="space-y-4">
            <div>
              <Label>Faktisk inntekt (NOK) *</Label>
              <Input
                type="number"
                min="0"
                placeholder={dugnad.estimated_income?.toString() || '0'}
                value={actualIncome}
                onChange={(e) => setActualIncome(e.target.value)}
              />
            </div>
            {actualIncome && participants.filter(p => p.status !== 'exempt' && p.status !== 'absent').length > 0 && (
              <div className="bg-accent/10 rounded-xl p-3 text-sm">
                <p className="font-medium text-accent">
                  Likt fordelt: {formatNOK(Math.round(parseFloat(actualIncome) / participants.filter(p => p.status !== 'exempt' && p.status !== 'absent').length))} per person
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fordeles på {participants.filter(p => p.status !== 'exempt' && p.status !== 'absent').length} deltakere (ikke fraværende/fritatte)
                </p>
              </div>
            )}
            <Button
              className="w-full"
              disabled={!actualIncome || distributeIncomeMutation.isPending}
              onClick={() => distributeIncomeMutation.mutate()}
            >
              <Zap className="w-4 h-4 mr-2" />
              {distributeIncomeMutation.isPending ? 'Fordeler...' : 'Fordel inntekt og registrer transaksjon'}
            </Button>
          </div>
        </div>
      )}

      {dugnad.income_distributed && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Inntekt fordelt og bokført</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              {formatNOK(dugnad.actual_income)} er registrert som transaksjon og fordelt på deltakerne.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}