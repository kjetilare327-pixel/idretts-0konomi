import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, CreditCard, ArrowRight } from 'lucide-react';
import { formatNOK, formatDate, CATEGORIES } from '@/lib/utils';

export default function RecentActivity({ transactions = [], payments = [] }) {
  // Combine last 5 transactions and recent payments into a unified feed
  const txFeed = transactions.slice(0, 5).map(t => ({
    id: t.id,
    type: 'transaction',
    subtype: t.type,
    label: t.description || CATEGORIES[t.category]?.label || 'Transaksjon',
    amount: t.amount,
    date: t.date,
    category: t.category,
  }));

  if (txFeed.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Siste aktivitet</h3>
        <Link to="/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
          Se alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {txFeed.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${item.subtype === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
              {item.subtype === 'income'
                ? <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                : <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
            </div>
            <span className={`text-sm font-semibold whitespace-nowrap ${item.subtype === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {item.subtype === 'income' ? '+' : '-'}{formatNOK(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}