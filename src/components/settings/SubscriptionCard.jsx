import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CreditCard, Users, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SubscriptionCard({ club }) {
  const [loading, setLoading] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  const activeMembers = members.filter(m => m.status === 'active');
  const memberCount = activeMembers.length;
  const monthlyTotal = memberCount * 19;

  // Check URL params for subscription result
  const params = new URLSearchParams(window.location.search);
  const subscriptionStatus = params.get('subscription');

  useEffect(() => {
    if (subscriptionStatus === 'success') {
      toast.success('Abonnement aktivert! Betaling gjennomført.');
    } else if (subscriptionStatus === 'cancelled') {
      toast.info('Abonnement ble avbrutt.');
    }
  }, [subscriptionStatus]);

  const handleSubscribe = async () => {
    // Check if running in iframe (preview mode)
    if (window.self !== window.top) {
      alert('Betaling fungerer kun fra den publiserte appen, ikke i forhåndsvisning.');
      return;
    }

    if (memberCount === 0) {
      toast.error('Ingen aktive medlemmer å abonnere for.');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('createSubscription', {
        memberCount,
        successUrl: `${window.location.origin}/settings?subscription=success`,
        cancelUrl: `${window.location.origin}/settings?subscription=cancelled`,
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error('Noe gikk galt. Prøv igjen.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Klubbabonnement</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Månedlig abonnement basert på antall aktive medlemmer. Administrert av lagleder.
      </p>

      <div className="bg-muted/40 rounded-lg p-4 mb-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" /> Aktive medlemmer
          </span>
          <span className="font-semibold">{memberCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pris per medlem</span>
          <span className="font-semibold">19 kr / mnd</span>
        </div>
        <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2">
          <span className="font-semibold">Total per måned</span>
          <span className="font-bold text-primary text-base">{monthlyTotal} kr</span>
        </div>
      </div>

      {subscriptionStatus === 'success' ? (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Abonnement er aktivt
        </div>
      ) : (
        <Button
          onClick={handleSubscribe}
          disabled={loading || memberCount === 0}
          className="w-full"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {loading ? 'Laster...' : `Abonner – ${monthlyTotal} kr/mnd`}
        </Button>
      )}

      {memberCount === 0 && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Legg til aktive medlemmer for å aktivere abonnement.
        </p>
      )}
    </div>
  );
}