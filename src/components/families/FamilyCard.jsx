import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Mail, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { formatNOK } from '@/lib/utils';
import VippsPayButton from '@/components/payments/VippsPayButton';
import { toast } from 'sonner';

export default function FamilyCard({ family }) {
  const [expanded, setExpanded] = useState(false);

  const inviteLink = `${window.location.origin}/onboarding?family=${encodeURIComponent(family.parentEmail)}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invitasjonslenke kopiert');
  };

  const statusColor = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    partial: 'bg-blue-50 text-blue-700 border-blue-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
  };

  const statusLabel = {
    pending: 'Venter', partial: 'Delvis', paid: 'Betalt', overdue: 'Forfalt',
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">{family.familyName?.[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Familie {family.familyName}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> {family.parentEmail}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Users className="w-2.5 h-2.5 mr-1" />{family.children.length} barn
              </Badge>
              {family.totalOwed > 0 ? (
                <Badge className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200 border">
                  {formatNOK(family.totalOwed)} utestående
                </Badge>
              ) : (
                <Badge className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200 border">
                  Ingen gjeld
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {family.totalOwed > 0 && (
            <VippsPayButton
              payment={{
                id: family.unpaidPayments[0]?.id,
                title: `Familie ${family.familyName} – alle krav`,
                total_amount: family.totalOwed,
                amount_paid: 0,
                status: 'pending',
              }}
              size="sm"
            />
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {/* Children list */}
          <div className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Barn / spillere</p>
            <div className="space-y-2">
              {family.children.map(child => (
                <div key={child.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium">{child.full_name?.[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{child.full_name}</p>
                      {child.team && <p className="text-xs text-muted-foreground">{child.team}</p>}
                    </div>
                  </div>
                  {child.birth_year && (
                    <span className="text-xs text-muted-foreground">f. {child.birth_year}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Unpaid payment requirements */}
          {family.unpaidPayments.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Ubetalte krav</p>
              <div className="space-y-2">
                {family.unpaidPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">Forfall: {p.due_date || '–'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatNOK((p.total_amount || 0) - (p.amount_paid || 0))}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusColor[p.status] || ''}`}>
                        {statusLabel[p.status] || p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite link */}
          <div className="p-4 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Invitasjonslenke til foresatt</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 text-xs bg-background border border-border rounded-md px-3 py-1.5 text-muted-foreground truncate"
              />
              <Button size="sm" variant="outline" onClick={copyInvite}>
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Kopier
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Lenken gir foresatt tilgang til oversikt over alle sine barn i klubben.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}