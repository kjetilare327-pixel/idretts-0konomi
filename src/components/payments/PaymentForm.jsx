import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAYMENT_CATEGORIES } from '@/lib/utils';
import { X } from 'lucide-react';

export default function PaymentForm({ members, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    total_amount: '',
    due_date: '',
    category: 'training_fees',
    parent_email: '',
    description: '',
    member_ids: [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, total_amount: parseFloat(form.total_amount), amount_paid: 0, status: 'pending' });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Opprett betalingskrav</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Tittel</Label>
          <Input placeholder="f.eks. Treningsavgift vår 2025" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Beløp (NOK)</Label>
            <Input type="number" min="0" step="0.01" placeholder="0,00" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} required />
          </div>
          <div>
            <Label>Forfallsdato</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Foresatt e-post</Label>
            <Input type="email" placeholder="foresatt@epost.no" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Beskrivelse</Label>
          <Textarea placeholder="Valgfri beskrivelse..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>
          <Button type="submit">Opprett krav</Button>
        </div>
      </form>
    </div>
  );
}