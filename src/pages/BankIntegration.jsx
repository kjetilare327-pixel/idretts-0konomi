import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Building2, RefreshCw, Link2, Unlink, Sparkles, CheckCircle2,
  TrendingUp, TrendingDown, AlertCircle, Loader2, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNOK, formatDate } from '@/lib/utils';
import ConnectBankDialog from '@/components/bank/ConnectBankDialog';
import BankRulesPanel from '@/components/bank/BankRulesPanel';
import UnknownTransactionsPanel from '@/components/bank/UnknownTransactionsPanel';
import { toast } from 'sonner';

// Simulated bank transactions for import
function generateSimulatedTransactions(clubId, connectionId) {
  const today = new Date();
  const sample = [
    { description: 'Kontingent Gutter 2012 - Ola Nordmann', amount: 1500 },
    { description: 'Treningsavgift Jenter 2014', amount: 800 },
    { description: 'Sponsorat - Brødrene Andersen AS', amount: 10000 },
    { description: 'Kontingent - Per Hansen', amount: 1500 },
    { description: 'Utstyr - Intersport', amount: -4200 },
    { description: 'Hallleie - Idrettshallen', amount: -2500 },
    { description: 'Dugnad inntekt', amount: 3200 },
    { description: 'Reise - cupreise Oslo', amount: -6000 },
    { description: 'Kontingent - Kari Olsen', amount: 1500 },
    { description: 'Treningsavgift - Sander Berg', amount: 800 },
    { description: 'Forsikring NIF', amount: -1100 },
    { description: 'Overføring fra konto 1234', amount: 5000 },
  ];
  return sample.map((s, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (i * 2 + 1));
    return {
      club_id: clubId,
      bank_connection_id: connectionId,
      date: d.toISOString().split('T')[0],
      amount: s.amount,
      description: s.description,
      status: 'unmatched',
    };
  });
}

export default function BankIntegration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [importing, setImporting] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];
  const clubId = club?.id;

  const { data: connections = [] } = useQuery({
    queryKey: ['bank-connections', clubId],
    queryFn: () => base44.entities.BankConnection.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: bankTransactions = [] } = useQuery({
    queryKey: ['bank-transactions', clubId],
    queryFn: () => base44.entities.BankTransaction.filter({ club_id: clubId }, '-date', 200),
    enabled: !!clubId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRequirement.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const createConnectionMutation = useMutation({
    mutationFn: (data) => base44.entities.BankConnection.create({ ...data, club_id: clubId, status: 'connected', last_synced: new Date().toISOString().split('T')[0] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-connections', clubId] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id) => base44.entities.BankConnection.update(id, { status: 'disconnected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections', clubId] });
      toast.success('Bank frakoblet');
    },
  });

  const handleConnected = async (data) => {
    await createConnectionMutation.mutateAsync(data);
    toast.success(`${data.bank_name} koblet til!`);
  };

  const handleImport = async () => {
    if (!connections[0]) return;
    setImporting(true);
    await new Promise(r => setTimeout(r, 1500));

    const simulated = generateSimulatedTransactions(clubId, connections[0].id);

    // Auto-match against payments
    const matched = simulated.map(tx => {
      const matchedPayment = payments.find(p =>
        Math.abs(p.total_amount - Math.abs(tx.amount)) < 1 &&
        p.status !== 'paid'
      );
      if (matchedPayment) {
        return { ...tx, status: 'matched', matched_payment_id: matchedPayment.id };
      }
      return tx;
    });

    await base44.entities.BankTransaction.bulkCreate(matched);

    // Update last synced
    await base44.entities.BankConnection.update(connections[0].id, {
      last_synced: new Date().toISOString().split('T')[0],
    });

    queryClient.invalidateQueries({ queryKey: ['bank-transactions', clubId] });
    queryClient.invalidateQueries({ queryKey: ['bank-connections', clubId] });

    const matchedCount = matched.filter(t => t.status === 'matched').length;
    const unmatchedCount = matched.filter(t => t.status === 'unmatched').length;
    setAiInsight(`Vi fant ${matched.length} nye transaksjoner. ${matchedCount} ble automatisk matchet mot eksisterende betalingskrav. ${unmatchedCount} transaksjoner trenger manuell kategorisering.`);

    setImporting(false);
    toast.success(`${matched.length} transaksjoner importert`);
  };

  const activeConnections = connections.filter(c => c.status === 'connected');
  const matchedCount = bankTransactions.filter(t => t.status === 'matched').length;
  const unmatchedCount = bankTransactions.filter(t => t.status === 'unmatched').length;
  const totalIn = bankTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = bankTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Empty state
  if (activeConnections.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bank-integrasjon</h1>
          <p className="text-sm text-muted-foreground mt-1">Koble til banken og importer transaksjoner automatisk</p>
        </div>

        <div className="bg-card rounded-2xl border border-border flex flex-col items-center py-16 px-6 text-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Koble din bank på 2 minutter</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Importér transaksjoner automatisk, match mot betalingskrav og få AI-innsikt om klubbens økonomi.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
            {['🏦 DNB', '🏧 Norwegian', '💳 SpareBank 1', '🔵 Nordea'].map(b => (
              <span key={b} className="px-3 py-1 rounded-full border border-border bg-muted/40">{b}</span>
            ))}
          </div>
          <Button size="lg" onClick={() => setShowConnect(true)}>
            <Link2 className="w-5 h-5 mr-2" /> Koble til bank
          </Button>
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-border w-full max-w-md">
            {[
              { label: 'Automatisk import', desc: 'Hent transaksjoner daglig' },
              { label: 'Smart matching', desc: 'Match mot betalingskrav' },
              { label: 'AI-innsikt', desc: 'Automatisk analyse' },
            ].map(f => (
              <div key={f.label} className="text-center">
                <p className="text-xs font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <ConnectBankDialog open={showConnect} onClose={() => setShowConnect(false)} onConnected={handleConnected} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bank-integrasjon</h1>
          <p className="text-sm text-muted-foreground mt-1">Importerte transaksjoner og matching</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowConnect(true)}>
            <Plus className="w-4 h-4 mr-2" /> Legg til konto
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Importer siste 30 dager
          </Button>
        </div>
      </div>

      {/* Connected accounts */}
      <div className="grid sm:grid-cols-2 gap-3">
        {activeConnections.map(conn => (
          <div key={conn.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{conn.bank_name}</p>
                <p className="text-xs text-muted-foreground">{conn.account_number} · Synkronisert {formatDate(conn.last_synced)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 text-xs">Tilkoblet</Badge>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => disconnectMutation.mutate(conn.id)}>
                <Unlink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{aiInsight}</p>
        </div>
      )}

      {/* Stats */}
      {bankTransactions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Totalt importert</p>
            <p className="text-xl font-bold mt-1">{bankTransactions.length}</p>
            <p className="text-xs text-muted-foreground">transaksjoner</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Matchet</p>
            <p className="text-xl font-bold mt-1 text-green-600">{matchedCount}</p>
            <p className="text-xs text-muted-foreground">automatisk</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Inn</p>
            <p className="text-xl font-bold mt-1 text-green-600">{formatNOK(totalIn)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Ut</p>
            <p className="text-xl font-bold mt-1 text-red-500">{formatNOK(totalOut)}</p>
          </div>
        </div>
      )}

      {/* Unknown transactions */}
      <UnknownTransactionsPanel
        transactions={bankTransactions}
        members={members}
        clubId={clubId}
      />

      {/* Matched list */}
      {matchedCount > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Matchede transaksjoner</h3>
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 text-xs">{matchedCount}</Badge>
          </div>
          <div className="divide-y divide-border">
            {bankTransactions.filter(t => t.status === 'matched').slice(0, 10).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatNOK(tx.amount)}
                  </span>
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 text-xs">Matchet</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      <BankRulesPanel clubId={clubId} />

      <ConnectBankDialog open={showConnect} onClose={() => setShowConnect(false)} onConnected={handleConnected} />
    </div>
  );
}