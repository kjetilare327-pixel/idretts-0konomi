import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Sparkles, Loader2, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatNOK } from '@/lib/utils';
import { toast } from 'sonner';

export default function GenerateMembershipDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['budgetLines'],
    queryFn: () => base44.entities.BudgetLine.list('-created_date', 200),
  });

  const activeSeason = useMemo(() => {
    if (selectedSeasonId) return seasons.find(s => s.id === selectedSeasonId);
    return seasons.find(s => s.status === 'active') || seasons[0];
  }, [seasons, selectedSeasonId]);

  // Auto-fill rate from budget line if available
  const suggestedRate = useMemo(() => {
    if (!activeSeason) return null;
    const bl = budgetLines.find(b =>
      b.season_id === activeSeason.id &&
      b.type === 'income' &&
      b.category === 'membership_fees' &&
      b.rate_per_member
    );
    return bl?.rate_per_member || null;
  }, [activeSeason, budgetLines]);

  const teams = useMemo(() => {
    const t = new Set(members.map(m => m.team).filter(Boolean));
    return Array.from(t).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    const active = members.filter(m => m.status === 'active' && m.membership_type === 'player');
    if (!teamFilter) return active;
    return active.filter(m => m.team === teamFilter);
  }, [members, teamFilter]);

  const handleUseSuggestedRate = () => {
    if (suggestedRate) setAmount(String(suggestedRate));
  };

  const handleGenerate = async () => {
    if (!club || !activeSeason || !amount || !dueDate) {
      toast.error('Fyll ut alle feltene');
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke('generateMembershipPayments', {
      clubId: club.id,
      seasonId: activeSeason.id,
      amount: parseFloat(amount),
      dueDate,
      teamFilter: teamFilter || undefined,
    });
    setLoading(false);
    setResult(res.data);
    if (res.data?.created > 0) {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success(`${res.data.created} betalingskrav opprettet!`);
    } else {
      toast.info(res.data?.message || 'Ingen nye krav opprettet');
    }
  };

  const handleClose = () => {
    setResult(null);
    setAmount('');
    setDueDate('');
    setTeamFilter('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Generer kontingentfakturaer
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <div className={`flex items-start gap-3 rounded-xl border p-4 ${result.created > 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200'}`}>
              {result.created > 0
                ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-sm font-semibold">{result.message}</p>
                {result.skipped > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{result.skipped} spiller(e) hadde allerede krav og ble hoppet over.</p>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={handleClose}>Lukk</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Season */}
            <div>
              <Label>Sesong</Label>
              <Select value={activeSeason?.id || ''} onValueChange={setSelectedSeasonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg sesong" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.status === 'active' ? ' (aktiv)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div>
              <Label>Kontingentsats per spiller (NOK)</Label>
              <div className="flex gap-2">
                <Input
                  type="number" min="0" placeholder="f.eks. 1500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {suggestedRate && !amount && (
                  <Button variant="outline" size="sm" className="whitespace-nowrap text-xs" onClick={handleUseSuggestedRate}>
                    Bruk {formatNOK(suggestedRate)}
                  </Button>
                )}
              </div>
              {suggestedRate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Anbefalt sats fra budsjett: {formatNOK(suggestedRate)}
                </p>
              )}
            </div>

            {/* Due date */}
            <div>
              <Label>Forfallsdato</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            {/* Team filter */}
            <div>
              <Label>Lag (valgfritt – la stå blank for alle)</Label>
              <Select value={teamFilter || '_all'} onValueChange={(v) => setTeamFilter(v === '_all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle lag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Alle lag</SelectItem>
                  {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {filteredMembers.length} aktive spillere
                {amount ? ` · Total: ${formatNOK(filteredMembers.length * parseFloat(amount || 0))}` : ''}
              </span>
              {activeSeason && <Badge variant="secondary" className="ml-auto text-xs">{activeSeason.name}</Badge>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Avbryt</Button>
              <Button
                onClick={handleGenerate}
                disabled={loading || !amount || !dueDate || !activeSeason}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generer betalingskrav
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}