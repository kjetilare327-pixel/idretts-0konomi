import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Send, Check, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNOK, formatDate, STATUS_CONFIG } from '@/lib/utils';

export default function UnpaidWidget({ payments, onMarkPaid, onSendReminder }) {
  const unpaid = (payments || []).filter(p => p.status !== 'paid').slice(0, 5);

  if (unpaid.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold mb-4">Ubetalte krav</h3>
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <Check className="w-10 h-10 mb-2 text-green-500" />
          <p className="text-sm">Ingen ubetalte krav! 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h3 className="text-base font-semibold">Ubetalte krav</h3>
          <Badge variant="secondary" className="text-xs">{unpaid.length}</Badge>
        </div>
        <Link to="/payments?filter=unpaid" className="text-xs text-primary hover:underline flex items-center gap-1">
          Vis alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {unpaid.map((payment) => {
          const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
          const remaining = payment.total_amount - (payment.amount_paid || 0);
          return (
            <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{payment.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Forfaller {formatDate(payment.due_date)}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.colorClass}`}>
                    {status.label}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-sm font-semibold whitespace-nowrap">{formatNOK(remaining)}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onSendReminder?.(payment)} title="Send påminnelse">
                  <Send className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMarkPaid?.(payment)} title="Marker som betalt">
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}