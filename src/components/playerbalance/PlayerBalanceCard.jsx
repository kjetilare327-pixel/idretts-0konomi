import React from 'react';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Clock, CreditCard, Hammer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNOK, formatDate, PAYMENT_CATEGORIES, STATUS_CONFIG } from '@/lib/utils';
import VippsPayButton from '@/components/payments/VippsPayButton';
import { cn } from '@/lib/utils';

export default function PlayerBalanceCard({ member, balanceData, expanded, onToggle }) {
  const { totalOwed = 0, totalPaid = 0, dugnadEarned = 0, payments = [], transactions = [] } = balanceData;
  const netBalance = dugnadEarned - totalOwed;
  const isPositive = netBalance >= 0;

  const unpaidPayments = payments.filter(p => p.status !== 'paid');
  const paidPayments = payments.filter(p => p.status === 'paid');

  // For "pay all" – create a synthetic payment object for VippsPayButton
  const syntheticPayment = unpaidPayments.length > 0 ? {
    id: unpaidPayments[0]?.id,
    title: `Alle utestående krav – ${member.full_name}`,
    total_amount: totalOwed,
    amount_paid: 0,
    status: 'pending',
    club_id: unpaidPayments[0]?.club_id,
  } : null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden transition-all">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">{member.full_name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{member.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {member.team && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{member.team}</Badge>}
              {member.birth_year && <span className="text-xs text-muted-foreground">f. {member.birth_year}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          {/* Summary pills */}
          <div className="hidden sm:flex items-center gap-3">
            {totalOwed > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-semibold text-red-700">Skylder {formatNOK(totalOwed)}</span>
              </div>
            )}
            {totalPaid > 0 && (
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-700">Betalt {formatNOK(totalPaid)}</span>
              </div>
            )}
            {totalOwed === 0 && totalPaid === 0 && (
              <span className="text-xs text-muted-foreground">Ingen krav</span>
            )}
          </div>
          <div className={cn(
            "text-right",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            <p className="text-xs text-muted-foreground font-normal">Netto saldo</p>
            <p className="font-bold text-base">{formatNOK(Math.abs(netBalance))}</p>
            <p className="text-[10px]">{isPositive ? 'til gode' : 'skylder'}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <TrendingDown className="w-3 h-3" /> Utestående
              </p>
              <p className="font-bold text-red-600">{formatNOK(totalOwed)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> Betalt totalt
              </p>
              <p className="font-bold text-green-600">{formatNOK(totalPaid)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Hammer className="w-3 h-3" /> Dugnad
              </p>
              <p className="font-bold text-blue-600">{formatNOK(dugnadEarned)}</p>
            </div>
          </div>

          {/* Pay all button */}
          {totalOwed > 0 && syntheticPayment && (
            <div className="p-5 bg-red-50/50 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-red-700">Betal hele saldoen nå</p>
                <p className="text-xs text-muted-foreground mt-0.5">{unpaidPayments.length} utestående krav · totalt {formatNOK(totalOwed)}</p>
              </div>
              <VippsPayButton payment={syntheticPayment} size="default" />
            </div>
          )}

          {/* Unpaid payments */}
          {unpaidPayments.length > 0 && (
            <div className="p-5 border-b border-border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" /> Utestående krav
              </h4>
              <div className="space-y-2">
                {unpaidPayments.map(p => {
                  const remaining = (p.total_amount || 0) - (p.amount_paid || 0);
                  const isOverdue = p.due_date && new Date(p.due_date) < new Date();
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Forfall {formatDate(p.due_date)}
                          {isOverdue && <span className="text-red-600 ml-1">· Forfalt</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-red-600">{formatNOK(remaining)}</span>
                        <VippsPayButton payment={p} size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment history */}
          {paidPayments.length > 0 && (
            <div className="p-5 border-b border-border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-500" /> Betalingshistorikk
              </h4>
              <div className="space-y-2">
                {paidPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{PAYMENT_CATEGORIES[p.category] || p.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{formatNOK(p.amount_paid)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          {transactions.length > 0 && (
            <div className="p-5">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" /> Transaksjonshistorikk
              </h4>
              <div className="space-y-2">
                {transactions.slice(0, 10).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.description || t.category}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatNOK(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.length === 0 && transactions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">Ingen historikk funnet for denne spilleren.</div>
          )}
        </div>
      )}
    </div>
  );
}