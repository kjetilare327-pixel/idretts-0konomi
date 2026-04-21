import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/lib/utils';
import { X } from 'lucide-react';

export default function TransactionForm({ initialType, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    type: initialType || 'income',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredCategories = Object.entries(CATEGORIES).filter(([, v]) => v.type === form.type);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {form.type === 'income' ? 'Registrer inntekt' : 'Registrer utgift'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: '' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Inntekt</SelectItem>
                <SelectItem value="expense">Utgift</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Beløp (NOK)</Label>
            <Input type="number" min="0" step="0.01" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Velg kategori" /></SelectTrigger>
              <SelectContent>
                {filteredCategories.map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dato</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>
        <div>
          <Label>Beskrivelse</Label>
          <Textarea placeholder="Valgfri beskrivelse..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>
          <Button type="submit">Lagre</Button>
        </div>
      </form>
    </div>
  );
}