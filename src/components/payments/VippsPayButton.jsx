import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { formatNOK } from '@/lib/utils';
import { toast } from 'sonner';

// Vipps orange brand color
const VIPPS_ORANGE = '#FF5B24';

export default function VippsPayButton({ payment, onSuccess, size = 'default' }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const amount = (payment.total_amount || 0) - (payment.amount_paid || 0);
  if (amount <= 0 || payment.status === 'paid') return null;

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await base44.functions.invoke('vippsPayment', {
      paymentId: payment.id,
      phone,
      amount,
      description: payment.title,
    });

    setLoading(false);

    if (res.data?.ok) {
      if (res.data.mode === 'vipps' && res.data.redirectUrl) {
        window.open(res.data.redirectUrl, '_blank');
        toast.success('Vipps-betaling startet – bekreft i Vipps-appen din');
      } else {
        toast.success('Betaling registrert!');
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        onSuccess?.();
      }
      setOpen(false);
      setPhone('');
    } else {
      toast.error(res.data?.error || 'Betalingsfeil – prøv igjen');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ backgroundColor: VIPPS_ORANGE }}
        className={`inline-flex items-center gap-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
      >
        <VippsLogo size={size === 'sm' ? 14 : 18} />
        Betal med Vipps
      </button>

      <Dialog open={open} onOpenChange={o => { if (!o) { setOpen(false); setPhone(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <VippsLogo size={20} color={VIPPS_ORANGE} />
              Betal med Vipps
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePay} className="space-y-4">
            <div className="bg-muted/40 rounded-xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{payment.title}</p>
              <p className="text-2xl font-bold">{formatNOK(amount)}</p>
            </div>

            <div>
              <Label>Mobilnummer</Label>
              <Input
                type="tel"
                placeholder="f.eks. 98765432"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                inputMode="numeric"
                required
                autoFocus
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Oppgi nummeret knyttet til Vipps-kontoen din.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
              <button
                type="submit"
                disabled={loading || phone.length < 8}
                style={{ backgroundColor: VIPPS_ORANGE }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-white hover:opacity-90 disabled:opacity-50 text-sm"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Behandler…</>
                  : <><VippsLogo size={16} /> Betal {formatNOK(amount)}</>
                }
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VippsLogo({ size = 18, color = 'white' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill={color === 'white' ? 'rgba(255,255,255,0.2)' : color} />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">V</text>
    </svg>
  );
}