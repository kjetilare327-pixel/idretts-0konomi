import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Receipt, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatNOK, formatDate, CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';

const expenseCategories = Object.entries(CATEGORIES).filter(([, v]) => v.type === 'expense');

export default function Expenses() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [showForm, setShowForm] = useState(params.get('action') === 'add');
  const [form, setForm] = useState({
    amount: '', category: 'equipment', description: '', date: new Date().toISOString().split('T')[0], receipt_url: '', to_reimburse: false,
  });
  const [uploading, setUploading] = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500),
  });

  const expenses = transactions.filter(t => t.type === 'expense');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create({
      type: 'expense', amount: parseFloat(data.amount), category: data.category,
      description: data.description + (data.to_reimburse ? ' [Refusjon]' : ''),
      date: data.date, receipt_url: data.receipt_url,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setForm({ amount: '', category: 'equipment', description: '', date: new Date().toISOString().split('T')[0], receipt_url: '', to_reimburse: false });
      toast.success('Utgift registrert');
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, receipt_url: file_url }));
    setUploading(false);
    toast.success('Kvittering lastet opp');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Utgifter</h1>
          <p className="text-sm text-muted-foreground mt-1">Registrer og administrer utgifter</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ny utgift
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Registrer utgift</h3>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Beløp (NOK)</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <Label>Dato</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea placeholder="Hva er utgiften for..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Kvittering</Label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploading ? 'Laster opp...' : 'Last opp fil'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                </label>
                {form.receipt_url && (
                  <Badge variant="secondary" className="text-xs">
                    <Image className="w-3 h-3 mr-1" /> Kvittering lastet opp
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.to_reimburse} onCheckedChange={(v) => setForm({ ...form, to_reimburse: v })} />
              <Label className="text-sm cursor-pointer">Skal refunderes</Label>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
              <Button type="submit" disabled={createMutation.isPending}>Lagre utgift</Button>
            </div>
          </form>
        </div>
      )}

      {/* Expense List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Laster...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Ingen utgifter registrert</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-red-50">
                    <Receipt className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description || CATEGORIES[t.category]?.label || 'Utgift'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      {t.category && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{CATEGORIES[t.category]?.label}</Badge>}
                      {t.receipt_url && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Kvittering</Badge>}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-600 whitespace-nowrap">-{formatNOK(t.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}