import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Calendar, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function Seasons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), start_date: '', end_date: '' });

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-year', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Season.create({ ...data, year: parseInt(data.year), status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setShowForm(false);
      setForm({ name: '', year: new Date().getFullYear(), start_date: '', end_date: '' });
      toast.success('Sesong opprettet');
    },
  });

  const toggleArchive = useMutation({
    mutationFn: (season) => base44.entities.Season.update(season.id, { status: season.status === 'archived' ? 'active' : 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Sesongstatus oppdatert');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sesonger</h1>
          <p className="text-sm text-muted-foreground mt-1">Administrer sesonger og perioder</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ny sesong
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Laster...</div>
      ) : seasons.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Ingen sesonger opprettet ennå</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seasons.map((s) => (
            <div key={s.id} className={`bg-card rounded-xl border p-5 transition-shadow hover:shadow-md ${s.status === 'archived' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.year}</p>
                </div>
                <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                  {s.status === 'active' ? 'Aktiv' : 'Arkivert'}
                </Badge>
              </div>
              {(s.start_date || s.end_date) && (
                <p className="text-xs text-muted-foreground mt-3">
                  {formatDate(s.start_date)} – {formatDate(s.end_date)}
                </p>
              )}
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => toggleArchive.mutate(s)}
                >
                  {s.status === 'active' ? (
                    <><Archive className="w-3.5 h-3.5 mr-1.5" /> Arkiver</>
                  ) : (
                    <><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Gjenåpne</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ny sesong</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
            <div>
              <Label>Navn</Label>
              <Input placeholder="f.eks. 2025, Vår 2025" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>År</Label>
              <Input type="number" min="2020" max="2030" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Startdato</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Sluttdato</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
              <Button type="submit">Opprett</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}