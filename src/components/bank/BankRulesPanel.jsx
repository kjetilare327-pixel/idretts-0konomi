import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Zap } from 'lucide-react';
import { CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

export default function BankRulesPanel({ clubId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keyword: '', category: 'membership_fees', transaction_type: 'income' });

  const { data: rules = [] } = useQuery({
    queryKey: ['bank-rules', clubId],
    queryFn: () => base44.entities.BankRule.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BankRule.create({ ...data, club_id: clubId, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-rules', clubId] });
      setShowForm(false);
      setForm({ keyword: '', category: 'membership_fees', transaction_type: 'income' });
      toast.success('Regel opprettet');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-rules', clubId] });
      toast.success('Regel slettet');
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          <h3 className="font-semibold">Automatiske regler</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(s => !s)}>
          <Plus className="w-4 h-4 mr-1" /> Ny regel
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/40 rounded-lg p-4 mb-4 space-y-3">
          <div>
            <Label>Nøkkelord i beskrivelse</Label>
            <Input placeholder='f.eks. "kontingent"' value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.transaction_type} onValueChange={v => setForm({ ...form, transaction_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Inntekt</SelectItem>
                  <SelectItem value="expense">Utgift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.keyword}>Lagre regel</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Avbryt</Button>
          </div>
        </div>
      )}

      {rules.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Ingen regler ennå. Legg til regler for å automatisk kategorisere transaksjoner.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">"{rule.keyword}"</span>
                <span className="text-muted-foreground">→</span>
                <span className={rule.transaction_type === 'income' ? 'text-green-600' : 'text-red-500'}>
                  {rule.transaction_type === 'income' ? 'Inntekt' : 'Utgift'}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{CATEGORIES[rule.category]?.label || rule.category}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(rule.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}