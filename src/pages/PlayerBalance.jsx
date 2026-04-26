import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Search, User, ChevronDown, ChevronUp, CreditCard, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatNOK, formatDate, PAYMENT_CATEGORIES } from '@/lib/utils';
import PlayerBalanceCard from '@/components/playerbalance/PlayerBalanceCard';
import FamilyBalanceSummary from '@/components/playerbalance/FamilyBalanceSummary';

export default function PlayerBalance() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.list('-created_date', 500),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500),
  });

  const isAdmin = user?.role === 'admin';

  // For non-admin: filter to only members where parent_email matches user email
  const visibleMembers = useMemo(() => {
    if (isAdmin) return members;
    return members.filter(m => m.parent_email?.toLowerCase() === user?.email?.toLowerCase()
      || m.email?.toLowerCase() === user?.email?.toLowerCase());
  }, [members, user, isAdmin]);

  const filtered = visibleMembers.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.full_name?.toLowerCase().includes(s) || m.team?.toLowerCase().includes(s);
  });

  // Group by parent for family view (admin only)
  const familyGroups = useMemo(() => {
    if (!isAdmin) return null;
    const map = {};
    visibleMembers.forEach(m => {
      const key = (m.parent_email || m.email || 'ingen').toLowerCase();
      if (!map[key]) map[key] = { key, parentEmail: m.parent_email || m.email || '', members: [] };
      map[key].members.push(m);
    });
    return Object.values(map);
  }, [visibleMembers, isAdmin]);

  // Compute balance per member
  const memberBalances = useMemo(() => {
    const map = {};
    members.forEach(m => {
      const memberPayments = payments.filter(p => (p.member_ids || []).includes(m.id));
      const totalOwed = memberPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + ((p.total_amount || 0) - (p.amount_paid || 0)), 0);
      const totalPaid = memberPayments.reduce((s, p) => s + (p.amount_paid || 0), 0);
      const memberTransactions = transactions.filter(t => t.member_id === m.id);
      const dugnadEarned = memberTransactions.filter(t => t.type === 'income' && t.category === 'other_income').reduce((s, t) => s + (t.amount || 0), 0);
      map[m.id] = { totalOwed, totalPaid, dugnadEarned, payments: memberPayments, transactions: memberTransactions };
    });
    return map;
  }, [members, payments, transactions]);

  const totalFamilyOwed = visibleMembers.reduce((s, m) => s + (memberBalances[m.id]?.totalOwed || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Spillersaldo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? `Personlig konto for ${visibleMembers.length} spillere`
              : `Din families saldo og historikk`}
          </p>
        </div>
        {!isAdmin && totalFamilyOwed > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <span className="text-sm text-red-700 font-medium">Totalt utestående: <strong>{formatNOK(totalFamilyOwed)}</strong></span>
          </div>
        )}
      </div>

      {/* Family summary for non-admin */}
      {!isAdmin && visibleMembers.length > 1 && (
        <FamilyBalanceSummary members={visibleMembers} memberBalances={memberBalances} />
      )}

      {/* Search (admin only) */}
      {isAdmin && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter spillernavn eller lag..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Player cards */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border flex flex-col items-center py-16 gap-3 text-center">
          <User className="w-10 h-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            {visibleMembers.length === 0
              ? 'Ingen spillere funnet for din konto.'
              : 'Ingen spillere matcher søket.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(member => (
            <PlayerBalanceCard
              key={member.id}
              member={member}
              balanceData={memberBalances[member.id] || {}}
              expanded={selectedMemberId === member.id}
              onToggle={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}