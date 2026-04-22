import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Send, Check, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNOK, formatDate, STATUS_CONFIG } from '@/lib/utils';

export default function UnpaidWidget({ payments, onMarkPaid, onSendReminder }) {
  const unpaid = (payments || []).filter(p => p.status !== 'paid');
  const overdue = unpaid.filter(p => p.due_date && new Date(p.due_date) < new Date());
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const displayed = expanded ? unpaid : unpaid.slice(0, 4);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === unpaid.length) {
      setSelected([]);
    } else {
      setSelected(unpaid.map(p => p.id));
    }
  };

  const handleBulkReminder = async () => {
    if (!selected.length) return;
    setSending(true);
    const targets = unpaid.filter(p => selected.includes(p.id));
    for (const p of targets) {
      await onSendReminder?.(p);
    }
    setSelected([]);
    setSending(false);
  };

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
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h3 className="text-base font-semibold">Ubetalte krav</h3>
          <Badge variant="secondary" className="text-xs">{unpaid.length}</Badge>
          {overdue.length > 0 && (
            <Badge className="text-xs bg-red-100 text-red-700 border-red-200">{overdue.length} forfalt</Badge>
          )}
        </div>
        <Link to="/payments?filter=unpaid" className="text-xs text-primary hover:underline flex items-center gap-1">
          Vis alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Bulk select bar */}
      <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.length === unpaid.length && unpaid.length > 0}
            onCheckedChange={selectAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
            {selected.length > 0 ? `${selected.length} valgt` : 'Velg alle'}
          </label>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          disabled={selected.length === 0 || sending}
          onClick={handleBulkReminder}
        >
          <Send className="w-3 h-3" />
          {sending ? 'Sender...' : `Send purring (${selected.length})`}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayed.map((payment) => {
          const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
          const remaining = payment.total_amount - (payment.amount_paid || 0);
          const isOverdue = payment.due_date && new Date(payment.due_date) < new Date();
          return (
            <div
              key={payment.id}
              className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                isOverdue ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900' : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <Checkbox
                checked={selected.includes(payment.id)}
                onCheckedChange={() => toggleSelect(payment.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{payment.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {isOverdue ? '⚠ Forfalt' : 'Forfaller'} {formatDate(payment.due_date)}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.colorClass}`}>
                    {status.label}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
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

      {/* Show more toggle */}
      {unpaid.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Vis færre</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Vis {unpaid.length - 4} til</>
          )}
        </button>
      )}
    </div>
  );
}