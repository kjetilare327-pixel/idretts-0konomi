import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, CreditCard, Receipt, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const actions = [
  { label: 'Registrer inntekt', icon: Plus, path: '/transactions?action=add&type=income', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { label: 'Registrer utgift', icon: Receipt, path: '/expenses?action=add', color: 'bg-red-50 text-red-700 hover:bg-red-100' },
  { label: 'Opprett betalingskrav', icon: CreditCard, path: '/payments?action=add', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { label: 'Send påminnelser', icon: Send, path: '/payments?filter=overdue', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Link key={action.label} to={action.path}>
          <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border transition-colors cursor-pointer ${action.color}`}>
            <action.icon className="w-5 h-5" />
            <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}