import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNOK } from '@/lib/utils';

export default function RecordPaymentDialog({ payment, open, onClose, onSubmit }) {
  const remaining = payment ? payment.total_amount - (payment.amount_paid || 0) : 0;
  const [form, setForm] = useState({
    amount: remaining,
    date: new Date().toISOString().split('T')[0],
    method: 'bank_transfer',
    note: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, amount: parseFloat(form.amount), payment_requirement_id: payment.id, club_id: payment.club_id });
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrer betaling</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {payment.title} – Gjenstående: <span className="font-semibold">{formatNOK(remaining)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Beløp</Label>
            <Input type="number" min="0" max={remaining} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dato</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <Label>Betalingsmåte</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bankoverføring</SelectItem>
                  <SelectItem value="vipps">Vipps</SelectItem>
                  <SelectItem value="cash">Kontant</SelectItem>
                  <SelectItem value="manual">Manuell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Avbryt</Button>
            <Button type="submit">Registrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}