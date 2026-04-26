import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function DugnadForm({ onSubmit, onCancel, isPending }) {
  const [form, setForm] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    description: '',
    estimated_income: '',
    hours: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      estimated_income: form.estimated_income ? parseFloat(form.estimated_income) : 0,
      hours: form.hours ? parseFloat(form.hours) : undefined,
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Ny dugnad</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Navn på dugnad *</Label>
            <Input
              placeholder="f.eks. Sportsligaen vår 2025"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Sted</Label>
            <Input
              placeholder="f.eks. Stadionveien 1"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <Label>Dato *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Tidspunkt</Label>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
          <div>
            <Label>Estimert inntekt (NOK)</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={form.estimated_income}
              onChange={(e) => setForm({ ...form, estimated_income: e.target.value })}
            />
          </div>
          <div>
            <Label>Antall timer</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="f.eks. 4"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Beskrivelse</Label>
          <Input
            placeholder="Hva skal dere gjøre?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>
          <Button type="submit" disabled={isPending}>Opprett dugnad</Button>
        </div>
      </form>
    </div>
  );
}