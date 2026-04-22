import React from 'react';
import { formatNOK } from '@/lib/utils';

/**
 * Shows a member's financial balance.
 * balance > 0 = owes money (red)
 * balance = 0 = all paid (green)
 * balance < 0 = credit (blue)
 */
export default function MemberBalanceBadge({ balance }) {
  if (balance === null || balance === undefined) return null;

  const isOwing = balance > 0;
  const isCredit = balance < 0;
  const isPaid = balance === 0;

  const colorClass = isOwing
    ? 'bg-red-50 text-red-700 border-red-200'
    : isCredit
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-green-50 text-green-700 border-green-200';

  const label = isOwing
    ? `Skylder ${formatNOK(balance)}`
    : isCredit
    ? `Til gode ${formatNOK(Math.abs(balance))}`
    : 'Betalt';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}