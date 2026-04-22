import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Users, Search, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import MemberBalanceBadge from '@/components/members/MemberBalanceBadge';
import { toast } from 'sonner';

export default function Members() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ full_name: '', birth_year: '', email: '', phone: '', team: '', parent_email: '', parent_name: '', membership_type: 'player', status: 'active' });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-created_date', 500),
  });

  // Compute balance per member: sum of (total_amount - amount_paid) for their payment requirements
  const memberBalances = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      (p.member_ids || []).forEach((mid) => {
        if (!map[mid]) map[mid] = 0;
        map[mid] += (p.total_amount || 0) - (p.amount_paid || 0);
      });
    });
    return map;
  }, [payments]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Member.create({ ...data, birth_year: data.birth_year ? parseInt(data.birth_year) : undefined, status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      resetForm();
      toast.success('Medlem lagt til');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Member.update(id, { ...data, birth_year: data.birth_year ? parseInt(data.birth_year) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      resetForm();
      toast.success('Medlem oppdatert');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Member.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Medlem slettet');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingMember(null);
    setForm({ full_name: '', birth_year: '', email: '', phone: '', team: '', parent_email: '', parent_name: '', membership_type: 'player' });
  };

  const handleEdit = (member) => {
    setForm({
      full_name: member.full_name || '', birth_year: member.birth_year?.toString() || '', email: member.email || '',
      phone: member.phone || '', team: member.team || '', parent_email: member.parent_email || '',
      parent_name: member.parent_name || '', membership_type: member.membership_type || 'player',
    });
    setEditingMember(member);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = members
    .filter(m => {
      if (!search) return true;
      const s = search.toLowerCase();
      return m.full_name?.toLowerCase().includes(s) || m.team?.toLowerCase().includes(s) || m.parent_email?.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      const nameA = (a.full_name || '').trim();
      const nameB = (b.full_name || '').trim();
      return nameA.localeCompare(nameB, 'nb', { sensitivity: 'base' });
    });

  const typeLabels = { player: 'Spiller', coach: 'Trener', volunteer: 'Frivillig', board_member: 'Styremedlem' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Medlemmer</h1>
          <p className="text-sm text-muted-foreground mt-1">{members.length} registrerte medlemmer</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nytt medlem
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Søk etter navn, lag eller e-post..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Member List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Laster...</div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-14 px-6 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Ingen medlemmer ennå</p>
              <p className="text-sm text-muted-foreground mt-1">Legg til spillere, trenere og andre for å holde oversikt over betalinger og aktivitet.</p>
            </div>
            <Button onClick={() => setShowForm(true)} size="lg" className="mt-1">
              <Plus className="w-4 h-4 mr-2" /> Legg til første medlem
            </Button>
            <label className="cursor-pointer text-sm text-primary underline-offset-4 hover:underline flex items-center gap-1">
              <Search className="w-3.5 h-3.5" />
              Importer fra Excel/CSV
              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) toast.info('Import-funksjon kommer snart. Legg til medlemmer manuelt foreløpig.');
                }}
              />
            </label>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Ingen medlemmer funnet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">{m.full_name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {m.team && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{m.team}</Badge>}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{typeLabels[m.membership_type] || m.membership_type}</Badge>
                      {m.birth_year && <span className="text-xs text-muted-foreground">f. {m.birth_year}</span>}
                      {memberBalances[m.id] !== undefined && (
                        <MemberBalanceBadge balance={memberBalances[m.id]} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(m)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Slette dette medlemmet?')) deleteMutation.mutate(m.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Rediger medlem' : 'Legg til medlem'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Fornavn *</Label>
              <Input placeholder="f.eks. Ola" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required autoFocus />
            </div>
            {editingMember && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fødselsår</Label>
                    <Input type="number" min="1950" max="2025" value={form.birth_year} onChange={(e) => setForm({ ...form, birth_year: e.target.value })} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.membership_type} onValueChange={(v) => setForm({ ...form, membership_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Spiller</SelectItem>
                        <SelectItem value="coach">Trener</SelectItem>
                        <SelectItem value="volunteer">Frivillig</SelectItem>
                        <SelectItem value="board_member">Styremedlem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Lag/gruppe</Label>
                  <Input placeholder="f.eks. Gutter 2012" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>E-post</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Foresatt navn</Label>
                    <Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Foresatt e-post</Label>
                    <Input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
                  </div>
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Avbryt</Button>
              <Button type="submit">{editingMember ? 'Oppdater' : 'Legg til'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}