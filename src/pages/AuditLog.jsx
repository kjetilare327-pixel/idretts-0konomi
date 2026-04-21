import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function AuditLog() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revisjonslogg</h1>
        <p className="text-sm text-muted-foreground mt-1">Fullstendig historikk over alle handlinger</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Laster...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Ingen loggoppføringer ennå</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.action}</Badge>
                      {log.entity_type && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{log.entity_type}</Badge>}
                    </div>
                    <p className="text-sm mt-1">{log.details || log.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{log.user_email}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(log.created_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}