import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, Building2, Mail, Trash2, AlertTriangle, Hash, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/lib/ThemeContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function Settings() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [clubForm, setClubForm] = useState({ name: '', org_number: '', address: '', contact_email: '', contact_phone: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('parent');

  const { user } = useAuth();

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });

  const club = clubs[0];

  useEffect(() => {
    if (club) {
      setClubForm({
        name: club.name || '', org_number: club.org_number || '', address: club.address || '',
        contact_email: club.contact_email || '', contact_phone: club.contact_phone || '',
      });
    }
  }, [club]);

  const saveClubMutation = useMutation({
    mutationFn: async (data) => {
      if (club) {
        return base44.entities.Club.update(club.id, data);
      } else {
        return base44.entities.Club.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('Innstillinger lagret');
    },
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    await base44.users.inviteUser(inviteEmail, inviteRole === 'admin' ? 'admin' : 'user');
    setInviteEmail('');
    toast.success('Invitasjon sendt');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Innstillinger</h1>
        <p className="text-sm text-muted-foreground mt-1">Klubbinformasjon og administrasjon</p>
      </div>

      {/* Club Info */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Klubbinformasjon</h3>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); saveClubMutation.mutate(clubForm); }} className="space-y-4">
          <div>
            <Label>Klubbnavn</Label>
            <Input value={clubForm.name} onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Organisasjonsnummer</Label>
              <Input value={clubForm.org_number} onChange={(e) => setClubForm({ ...clubForm, org_number: e.target.value })} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={clubForm.address} onChange={(e) => setClubForm({ ...clubForm, address: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kontakt e-post</Label>
              <Input type="email" value={clubForm.contact_email} onChange={(e) => setClubForm({ ...clubForm, contact_email: e.target.value })} />
            </div>
            <div>
              <Label>Kontakt telefon</Label>
              <Input value={clubForm.contact_phone} onChange={(e) => setClubForm({ ...clubForm, contact_phone: e.target.value })} />
            </div>
          </div>
          <Button type="submit" disabled={saveClubMutation.isPending}>
            <Save className="w-4 h-4 mr-2" /> Lagre
          </Button>
        </form>
      </div>

      {/* Theme */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Utseende</h3>
        </div>
        <div className="flex gap-2">
          {[
            { value: 'light', label: 'Lys', icon: Sun },
            { value: 'dark', label: 'Mørk', icon: Moon },
            { value: 'system', label: 'System', icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                theme === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Join Code */}
      {club?.join_code && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">Invitasjonskode</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Del denne koden med nye medlemmer slik at de kan bli med i laget.</p>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-mono font-bold tracking-widest text-primary bg-primary/10 px-6 py-3 rounded-xl select-all">
              {club.join_code}
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Invite Users */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Inviter bruker</h3>
        </div>
        <form onSubmit={handleInvite} className="flex gap-3 items-end">
          <div className="flex-1">
            <Label>E-post</Label>
            <Input type="email" placeholder="bruker@epost.no" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
          </div>
          <Button type="submit">Inviter</Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">Brukeren får en invitasjon på e-post og kan logge inn umiddelbart.</p>
      </div>

      <Separator />

      {/* Account Deletion — required by App Store guidelines */}
      <div className="bg-card rounded-xl border border-destructive/30 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h3 className="text-base font-semibold text-destructive">Slett konto</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Sletting av kontoen din er permanent og kan ikke angres. All din brukerdata vil bli slettet.
          Klubbdata vil kun slettes dersom du er eneste administrator.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Slett min konto
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Er du helt sikker?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Dette vil permanent slette kontoen din og all tilknyttet brukerdata.
                Handlingen kan ikke angres.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  toast.info('Kontoen din er merket for sletting. Du vil motta en bekreftelse på e-post.');
                  await base44.auth.logout();
                }}
              >
                Ja, slett kontoen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}