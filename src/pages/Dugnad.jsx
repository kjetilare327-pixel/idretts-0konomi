import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Handshake, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DugnadForm from '@/components/dugnad/DugnadForm';
import DugnadCard from '@/components/dugnad/DugnadCard';
import DugnadDetail from '@/components/dugnad/DugnadDetail';
import { toast } from 'sonner';

export default function Dugnad() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedDugnad, setSelectedDugnad] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];

  const { data: dugnader = [], isLoading } = useQuery({
    queryKey: ['dugnader', club?.id],
    queryFn: () => base44.entities.Dugnad.filter({ club_id: club.id }, '-date', 100),
    enabled: !!club?.id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ['all-dugnad-participants', club?.id],
    queryFn: () => base44.entities.DugnadParticipant.filter({ club_id: club.id }),
    enabled: !!club?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Dugnad.create({ ...data, club_id: club.id, participant_ids: [] }),
    onSuccess: (newDugnad) => {
      queryClient.invalidateQueries({ queryKey: ['dugnader'] });
      setShowForm(false);
      toast.success('Dugnad opprettet!');
      setSelectedDugnad(newDugnad);
    },
  });

  const participantCountMap = useMemo(() => {
    const map = {};
    allParticipants.forEach(p => {
      map[p.dugnad_id] = (map[p.dugnad_id] || 0) + 1;
    });
    return map;
  }, [allParticipants]);

  // If viewing detail
  if (selectedDugnad) {
    const fresh = dugnader.find(d => d.id === selectedDugnad.id) || selectedDugnad;
    return (
      <DugnadDetail
        dugnad={fresh}
        members={members}
        club={club}
        onBack={() => setSelectedDugnad(null)}
      />
    );
  }

  const filtered = dugnader.filter(d => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalIncome = dugnader.reduce((s, d) => s + (d.actual_income || 0), 0);
  const completedCount = dugnader.filter(d => d.status === 'completed').length;
  const plannedCount = dugnader.filter(d => d.status === 'planned').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dugnad</h1>
          <p className="text-sm text-muted-foreground mt-1">Organiser og følg opp dugnader for klubben</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ny dugnad
        </Button>
      </div>

      {/* Summary */}
      {dugnader.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">Totalt inntjent</p>
            <p className="text-xl font-bold mt-1 text-accent">
              {totalIncome.toLocaleString('nb-NO')} kr
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">Fullført</p>
            <p className="text-xl font-bold mt-1 text-green-600">{completedCount}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">Planlagt</p>
            <p className="text-xl font-bold mt-1 text-blue-600">{plannedCount}</p>
          </div>
        </div>
      )}

      {/* New dugnad form */}
      {showForm && (
        <DugnadForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Filters */}
      {dugnader.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Søk etter dugnad..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="planned">Planlagt</SelectItem>
              <SelectItem value="ongoing">Pågår</SelectItem>
              <SelectItem value="completed">Fullført</SelectItem>
              <SelectItem value="cancelled">Avlyst</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Laster...</div>
      ) : dugnader.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border flex flex-col items-center py-16 px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Handshake className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Ingen dugnader ennå</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Dugnad er en av de viktigste inntektskildene for norske idrettslag. Opprett din første!
            </p>
          </div>
          <Button size="lg" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Opprett første dugnad
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">
          Ingen dugnader funnet
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <DugnadCard
              key={d.id}
              dugnad={d}
              participantCount={participantCountMap[d.id] || 0}
              onOpen={() => setSelectedDugnad(d)}
            />
          ))}
        </div>
      )}
    </div>
  );
}