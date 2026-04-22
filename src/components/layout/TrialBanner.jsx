import React from 'react';
import { Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const TRIAL_DAYS = 21;

export default function TrialBanner({ club, onDismiss }) {
  if (!club) return null;

  const trialEnd = club.trial_ends_at
    ? new Date(club.trial_ends_at)
    : new Date(new Date(club.created_date).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const now = new Date();
  const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

  // Only show if still in trial
  if (club.subscription_status === 'active' || daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 5;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
      isUrgent
        ? 'bg-destructive/10 text-destructive border-b border-destructive/20'
        : 'bg-primary/10 text-primary border-b border-primary/20'
    }`}>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span>
          {isUrgent
            ? `⚠️ Kun ${daysLeft} dag${daysLeft === 1 ? '' : 'er'} igjen av prøveperioden!`
            : `Gratis prøveperiode: ${daysLeft} dag${daysLeft === 1 ? '' : 'er'} igjen`}
          {' '}
          <Link to="/settings" className="underline font-semibold hover:opacity-80">
            Aktiver abonnement
          </Link>
        </span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}