import React from 'react';
import { Calendar, MapPin, Clock, Users, TrendingUp, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNOK, formatDate } from '@/lib/utils';

const STATUS_MAP = {
  planned: { label: 'Planlagt', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ongoing: { label: 'Pågår', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completed: { label: 'Fullført', color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Avlyst', color: 'bg-red-100 text-red-700 border-red-200' },
};

export default function DugnadCard({ dugnad, participantCount, onOpen }) {
  const status = STATUS_MAP[dugnad.status] || STATUS_MAP.planned;

  return (
    <button
      onClick={onOpen}
      className="w-full bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold group-hover:text-primary transition-colors truncate">
              {dugnad.name}
            </h3>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color}`}>
              {status.label}
            </Badge>
            {dugnad.income_distributed && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                Inntekt fordelt
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-primary">{formatNOK(dugnad.actual_income || dugnad.estimated_income || 0)}</p>
          <p className="text-[10px] text-muted-foreground">{dugnad.actual_income ? 'faktisk' : 'estimert'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(dugnad.date)}
          {dugnad.time && ` kl. ${dugnad.time}`}
        </span>
        {dugnad.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {dugnad.location}
          </span>
        )}
        {dugnad.hours && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {dugnad.hours} timer
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {participantCount} deltakere
        </span>
      </div>
    </button>
  );
}