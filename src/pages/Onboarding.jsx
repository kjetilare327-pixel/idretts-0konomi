import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Users, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [loading, setLoading] = useState(false);

  // Create club state
  const [clubName, setClubName] = useState('');

  // Join club state
  const [joinCode, setJoinCode] = useState('');

  const generateJoinCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 21);
    const club = await base44.entities.Club.create({
      name: clubName,
      join_code: generateJoinCode(),
      subscription_status: 'trial',
      trial_ends_at: trialEnd.toISOString().split('T')[0],
    });
    await base44.auth.updateMe({ role: 'admin', club_id: club.id });
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    toast.success(`Laget "${clubName}" er opprettet!`);
    navigate('/');
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const clubs = await base44.entities.Club.filter({ join_code: joinCode.trim() });
    if (!clubs || clubs.length === 0) {
      toast.error('Ugyldig kode. Sjekk at du har skrevet riktig.');
      setLoading(false);
      return;
    }
    const club = clubs[0];
    await base44.auth.updateMe({ role: 'user', club_id: club.id });
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    toast.success(`Du er nå med i "${club.name}"!`);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-2xl">KF</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">KlubbFinans</h1>
          <p className="text-muted-foreground text-sm mt-1">Klubbøkonomi på ett sted</p>
        </div>

        {!mode && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center mb-6">Kom i gang</h2>
            <button
              onClick={() => setMode('create')}
              className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Opprett et lag</p>
                <p className="text-sm text-muted-foreground mt-0.5">Sett opp et nytt lag og bli administrator</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-accent hover:bg-accent/5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Bli med i et lag</p>
                <p className="text-sm text-muted-foreground mt-0.5">Skriv inn en 6-sifret invitasjonskode</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="bg-card rounded-2xl border border-border p-6">
            <button onClick={() => setMode(null)} className="text-sm text-muted-foreground hover:text-foreground mb-4 block">← Tilbake</button>
            <h2 className="text-lg font-semibold mb-4">Opprett lag</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Lagnavn</Label>
                <Input
                  placeholder="f.eks. Brann FK U14"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                Opprett lag
              </Button>
            </form>
          </div>
        )}

        {mode === 'join' && (
          <div className="bg-card rounded-2xl border border-border p-6">
            <button onClick={() => setMode(null)} className="text-sm text-muted-foreground hover:text-foreground mb-4 block">← Tilbake</button>
            <h2 className="text-lg font-semibold mb-4">Bli med i lag</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <Label>6-sifret invitasjonskode</Label>
                <Input
                  placeholder="123456"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  inputMode="numeric"
                  required
                  autoFocus
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || joinCode.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                Bli med
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}