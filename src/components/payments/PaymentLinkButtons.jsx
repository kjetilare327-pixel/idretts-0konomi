import React, { useState } from 'react';
import { ExternalLink, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatNOK } from '@/lib/utils';

const VIPPS_ORANGE = '#FF5B24';

export default function PaymentLinkButtons({ payment }) {
  const queryClient = useQueryClient();
  const [vippsLoading, setVippsLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeUrl, setStripeUrl] = useState(payment.stripe_payment_link || '');
  const [copied, setCopied] = useState(false);

  const amount = (payment.total_amount || 0) - (payment.amount_paid || 0);
  if (amount <= 0 || payment.status === 'paid') return null;

  const handleVippsLink = async () => {
    setVippsLoading(true);
    // Open Vipps dialog via existing VippsPayButton logic – here we just copy a deeplink
    const vippsDeeplink = `vipps://payment?amount=${Math.round(amount * 100)}&message=${encodeURIComponent(payment.title)}`;
    // Generate a shareable Vipps MobilePay-style URL (works without credentials)
    const shareUrl = `https://qr.vipps.no/pay?amount=${Math.round(amount * 100)}&message=${encodeURIComponent(payment.title)}`;

    await navigator.clipboard.writeText(shareUrl).catch(() => {});

    // Mark link as sent
    await base44.entities.PaymentRequirement.update(payment.id, {
      link_status: 'vipps_link_sent',
      last_reminder_date: new Date().toISOString().split('T')[0],
    });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    toast.success('Vipps-lenke kopiert til utklippstavlen – del med betaleren');
    setVippsLoading(false);
  };

  const handleStripeLink = async () => {
    if (stripeUrl) {
      await navigator.clipboard.writeText(stripeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Stripe-lenke kopiert!');
      return;
    }

    setStripeLoading(true);
    const res = await base44.functions.invoke('createStripePaymentLink', {
      paymentId: payment.id,
      amount,
      description: payment.title,
      email: payment.parent_email || '',
    });

    if (res.data?.ok && res.data?.url) {
      setStripeUrl(res.data.url);
      await navigator.clipboard.writeText(res.data.url).catch(() => {});

      // Store link on the payment record
      await base44.entities.PaymentRequirement.update(payment.id, {
        stripe_payment_link: res.data.url,
        link_status: 'stripe_link_sent',
      });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Stripe-lenke generert og kopiert – del med betaleren');
      window.open(res.data.url, '_blank');
    } else {
      toast.error(res.data?.error || 'Kunne ikke generere Stripe-lenke');
    }
    setStripeLoading(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Vipps link button */}
      <button
        onClick={handleVippsLink}
        disabled={vippsLoading}
        style={{ backgroundColor: VIPPS_ORANGE }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        title="Generer og kopier Vipps-lenke"
      >
        {vippsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="font-bold">V</span>}
        Vipps-lenke
      </button>

      {/* Stripe link button */}
      <button
        onClick={handleStripeLink}
        disabled={stripeLoading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#635BFF] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        title="Generer og kopier Stripe-betalingslenke"
      >
        {stripeLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : copied ? (
          <Check className="w-3 h-3" />
        ) : stripeUrl ? (
          <Copy className="w-3 h-3" />
        ) : (
          <ExternalLink className="w-3 h-3" />
        )}
        {stripeUrl ? (copied ? 'Kopiert!' : 'Kopier lenke') : 'Stripe-lenke'}
      </button>
    </div>
  );
}