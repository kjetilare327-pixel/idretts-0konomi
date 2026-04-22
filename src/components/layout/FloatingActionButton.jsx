import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ArrowUpRight, ArrowDownRight, CreditCard, Users } from 'lucide-react';

const actions = [
  { label: 'Ny inntekt', icon: ArrowUpRight, path: '/transactions?action=add&type=income', color: 'bg-green-500 hover:bg-green-600 text-white' },
  { label: 'Ny utgift', icon: ArrowDownRight, path: '/transactions?action=add&type=expense', color: 'bg-red-500 hover:bg-red-600 text-white' },
  { label: 'Nytt krav', icon: CreditCard, path: '/payments?action=add', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
  { label: 'Nytt medlem', icon: Users, path: '/members?action=add', color: 'bg-purple-500 hover:bg-purple-600 text-white' },
];

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB container */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end gap-2">
        {/* Action items */}
        {open && (
          <div className="flex flex-col items-end gap-2 mb-1">
            {actions.map((action) => (
              <button
                key={action.path}
                onClick={() => handleAction(action.path)}
                className="flex items-center gap-2 shadow-lg rounded-full pr-4 pl-3 py-2 text-sm font-medium transition-all bg-card border border-border hover:bg-muted text-foreground"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${action.color}`}>
                  <action.icon className="w-3.5 h-3.5" />
                </div>
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setOpen(!open)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${
            open
              ? 'bg-muted text-foreground rotate-45'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
          }`}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}