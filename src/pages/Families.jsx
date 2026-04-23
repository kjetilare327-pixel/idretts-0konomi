import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Search, Users, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FamilyCard from '@/components/families/FamilyCard';
import { formatNOK } from '@/lib/utils';

export default function Families() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-created_date', 500),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentIds) => {
      for (const pid of paymentIds) {
        const p = payments.find(x => x.id === pid);
        if (!p || p.status === 'paid') continue;
        await base44.entities.PaymentRequirement.update(pid, {
          amount_paid: p.total_amount,
          status: 'paid',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Alle familiebetalinger er markert som betalt');
    },
  });

  // Group members by parent_email → families
  const families = useMemo(() => {
    const map = {};
    members.forEach(m => {
      const key = (m.parent_email || '').trim().toLowerCase();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          parentEmail: m.parent_email,
          parentName: m.parent_name || '',
          familyName: extractFamilyName(m.parent_name, m.full_name),
          children: [],
          unpaidPayments: [],
          totalOwed: 0,
        };
      }
      map[key].children.push(m);
    });

    // Attach payments
    payments.forEach(p => {
      if (p.status === 'paid') return;
      const owed = (p.total_amount || 0) - (p.amount_paid || 0);
      if (owed <= 0) return;
      (p.member_ids || []).forEach(mid => {
        const member = members.find(m => m.id === mid);
        if (!member) return;
        const key = (member.parent_email || '').trim().toLowerCase();
        if (!map[key]) return;
        // avoid duplicating the same payment requirement
        if (!map[key].unpaidPayments.find(x => x.id === p.id)) {
          map[key].unpaidPayments.push(p);
          map[key].totalOwed += owed;
        }
      });
    });

    return Object.values(map).sort((a, b) =>
      a.familyName.localeCompare(b.familyName, 'nb', { sensitivity: 'base' })
    );
  }, [members, payments]);

  const filtered = families.filter(f => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      f.familyName.toLowerCase().includes(s) ||
      f.parentEmail.toLowerCase().includes(s) ||
      f.parentName.toLowerCase().includes(s) ||
      f.children.some(c => c.full_name?.toLowerCase().includes(s))
    );
  });

  const totalFamiliesOwed = families.reduce((s, f) => s + f.totalOwed, 0);
  const familiesWithDebt = families.filter(f => f.totalOwed > 0).length;

  const handleAiInsight = async () => {
    setAiLoading(true);
    const summary = families
      .filter(f => f.totalOwed > 0)
      .slice(0, 10)
      .map(f => `Familie ${f.familyName}: ${f.unpaidPayments.length} ubetalte krav, ${formatNOK(f.totalOwed)}`)
      .join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du er en idrettsklubb-økonom. Her er oversikt over familier med ubetalte krav:\n${summary || 'Ingen ubetalte krav.'}\n\nGi en kort og presis oppsummering på norsk (maks 3 setninger) med de viktigste innsiktene og eventuelle anbefalinger for oppfølging.`,
    });
    setAiInsight(result);
    setAiLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Familieoversikt</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {families.length} familier · {familiesWithDebt} med utestående betalinger
          </p>
        </div>
        <Button variant="outline" onClick={handleAiInsight} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          AI-innsikt
        </Button>
      </div>

      {/* AI insight */}
      {aiInsight && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex gap-3">
          <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-sm text-foreground">{aiInsight}</p>
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Familier totalt', value: families.length },
          { label: 'Med barn i klubben', value: families.reduce((s, f) => s + f.children.length, 0) },
          { label: 'Familier med gjeld', value: familiesWithDebt },
          { label: 'Totalt utestående', value: formatNOK(totalFamiliesOwed) },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Søk på familienavn, foresatt eller barnets navn..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Family cards */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center py-16 gap-3 text-center">
          <Users className="w-10 h-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            {families.length === 0
              ? 'Ingen familier funnet. Legg til foresatt e-post på medlemmer for å se familieoversikt.'
              : 'Ingen familier matcher søket ditt.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(family => (
            <FamilyCard
              key={family.parentEmail}
              family={family}
              onPayAll={() => markPaidMutation.mutate(family.unpaidPayments.map(p => p.id))}
              isPaying={markPaidMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function extractFamilyName(parentName, childName) {
  if (parentName) {
    const parts = parentName.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : parentName;
  }
  if (childName) {
    const parts = childName.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : childName;
  }
  return 'Ukjent';
}