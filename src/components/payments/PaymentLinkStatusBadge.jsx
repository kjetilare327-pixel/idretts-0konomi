import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle2 } from 'lucide-react';

const STATUS_MAP = {
  vipps_link_sent: { label: 'Vipps-lenke sendt', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  stripe_link_sent: { label: 'Stripe-lenke sendt', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  paid_via_vipps: { label: 'Betalt via Vipps', className: 'bg-green-100 text-green-700 border-green-200' },
  paid_via_stripe: { label: 'Betalt via Stripe', className: 'bg-green-100 text-green-700 border-green-200' },
};

export default function PaymentLinkStatusBadge({ linkStatus }) {
  const config = STATUS_MAP[linkStatus];
  if (!config) return null;

  const isPaid = linkStatus?.startsWith('paid_');
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${config.className}`}>
      {isPaid ? <CheckCircle2 className="w-2.5 h-2.5" /> : <ExternalLink className="w-2.5 h-2.5" />}
      {config.label}
    </Badge>
  );
}