import React from 'react';
import { Users, TrendingDown, TrendingUp } from 'lucide-react';
import { formatNOK } from '@/lib/utils';

export default function FamilyBalanceSummary({ members, memberBalances }) {
  const totalOwed = members.reduce((s, m) => s + (memberBalances[m.id]?.totalOwed || 0), 0);
  const totalPaid = members.reduce((s, m) => s + (memberBalances[m.id]?.totalPaid || 0), 0);
  const totalDugnad = members.reduce((s, m) => s + (memberBalances[m.id]?.dugnadEarned || 0), 0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Familieoversikt – {members.length} barn</h3>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-red-600 font-medium">Utestående</p>
          </div>
          <p className="font-bold text-red-700 text-lg">{formatNOK(totalOwed)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-green-600 font-medium">Betalt totalt</p>
          </div>
          <p className="font-bold text-green-700 text-lg">{formatNOK(totalPaid)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <p className="text-xs text-blue-600 font-medium">Dugnad</p>
          </div>
          <p className="font-bold text-blue-700 text-lg">{formatNOK(totalDugnad)}</p>
        </div>
      </div>
    </div>
  );
}