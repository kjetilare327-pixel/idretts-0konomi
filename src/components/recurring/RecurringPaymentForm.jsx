import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Users, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PAYMENT_CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';

const FREQUENCIES = [
  { value: 'annual',    label: 'Årlig' },
  { value: 'biannual',  label: 'Halvårlig' },
  { value: 'quarterly', label: 'Kvartalsvis' },
  { value: 'monthly',   label: 'Månedlig' },
];

export default function RecurringPaymentForm({ members, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', amount: '', category: 'membership_fees',
    frequency: 'annual', next_due_date: '', team_filter: 'all',
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const teams = Array.from(new Set(members.map(m => m.team).filter(Boolean))).sort();

  const filteredMembers = form.team_filter === 'all'
    ? members
    : members.filter(m => m.team === form.team_filter);

  // Auto-select when team filter changes
  useEffect(() => {
    setSelectedIds(filteredMembers.map(m => m.id));
  }, [form.team_filter, members.length]);

  const toggleMember = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getAiSuggestion = async () => {
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du er en økonomiassistent for en norsk idrettsklubb. 
Gi ett konkret forslag til kontingentbeløp og frekvens basert på disse dataene:
- Antall valgte medlemmer: ${selectedIds.length}
- Kategori: ${form.category}
- Historisk data: Vanlig norsk idrettsklubb har ofte 1000-2000 kr/år for spillere, 500-1000 kr/år for andre.

Svar KUN med dette JSON-formatet:
{"amount": 1200, "frequency": "annual", "title": "Medlemskontingent 2025", "reason": "Basert på norsk standard for idrettslag"}`,
        response_json_schema: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            frequency: { type: 'string' },
            title: { type: 'string' },
            reason: { type: 'string' },
          }
        }
      });
      setAiSuggestion(result);
    } catch {
      toast.error('Kunne ikke hente AI-forslag');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setForm(f => ({
      ...f,
      amount: String(aiSuggestion.amount),
      frequency: aiSuggestion.frequency || f.frequency,
      title: aiSuggestion.title || f.title,
    }));
    setAiSuggestion(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) { toast.error('Velg minst ett medlem'); return; }
    onSubmit({
      title: form.title,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      frequency: form.frequency,
      next_due_date: form.next_due_date,
      team_filter: form.team_filter !== 'all' ? form.team_filter : '',
      member_ids: selectedIds,
      status: 'active',
    });
  };

  const freqLabel = FREQUENCIES.find(f => f.value === form.frequency)?.label || '';
  const totalAmount = selectedIds.length * (parseFloat(form.amount) || 0);

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Ny automatisk kontingent</h3>
        <Button size="icon" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </div>

      {/* AI Suggestion */}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={getAiSuggestion} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />}
          AI-forslag
        </Button>
        {aiSuggestion && (
          <div className="flex-1 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-amber-800 dark:text-amber-200 flex-1">
              <strong>{aiSuggestion.amount} kr {FREQUENCIES.find(f=>f.value===aiSuggestion.frequency)?.label?.toLowerCase()}</strong> — {aiSuggestion.reason}
            </span>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-700 hover:bg-amber-100" onClick={applyAiSuggestion}>Bruk</Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Tittel *</Label>
            <Input placeholder="f.eks. Medlemskontingent 2025" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <Label>Beløp (kr) *</Label>
            <Input type="number" min="0" placeholder="1200" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
          </div>
          <div>
            <Label>Frekvens *</Label>
            <Select value={form.frequency} onValueChange={v => setForm({...form, frequency: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Første forfall *</Label>
            <Input type="date" value={form.next_due_date} onChange={e => setForm({...form, next_due_date: e.target.value})} required />
          </div>
        </div>

        <div>
          <Label>Beskrivelse</Label>
          <Input placeholder="Valgfri beskrivelse..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        </div>

        {/* Member selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Velg medlemmer</Label>
            <div className="flex items-center gap-2">
              <Select value={form.team_filter} onValueChange={v => setForm({...form, team_filter: v})}>
                <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Alle lag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle lag</SelectItem>
                  {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <button type="button" className="text-xs text-primary underline-offset-4 hover:underline" onClick={() => setSelectedIds(filteredMembers.map(m => m.id))}>Alle</button>
              <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setSelectedIds([])}>Ingen</button>
            </div>
          </div>

          <div className="border border-border rounded-lg max-h-44 overflow-y-auto divide-y divide-border">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 text-center">Ingen medlemmer funnet</p>
            ) : filteredMembers.map(m => (
              <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleMember(m.id)} className="rounded" />
                <span className="text-sm font-medium flex-1">{m.full_name}</span>
                {m.team && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{m.team}</Badge>}
              </label>
            ))}
          </div>

          {selectedIds.length > 0 && form.amount && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{selectedIds.length} medlemmer · {freqLabel} · Totalt <strong className="text-foreground">{totalAmount.toLocaleString('nb-NO')} kr</strong></span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>
          <Button type="submit">Opprett kontingent</Button>
        </div>
      </form>
    </div>
  );
}