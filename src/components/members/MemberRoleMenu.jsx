import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Shield, TrendingUp, Users, Heart, User, BookOpen, Edit2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const CLUB_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full tilgang til alt', icon: Shield, color: 'text-purple-600' },
  { value: 'okonomi', label: 'Økonomiansvarlig', description: 'Økonomi og rapporter', icon: TrendingUp, color: 'text-blue-600' },
  { value: 'coach', label: 'Trener / Lagleder', description: 'Ser kun sitt lag', icon: Users, color: 'text-green-600' },
  { value: 'parent', label: 'Forelder / Verge', description: 'Ser kun egne barn', icon: Heart, color: 'text-rose-500' },
  { value: 'player', label: 'Spiller / Medlem', description: 'Grunnleggende tilgang', icon: User, color: 'text-gray-500' },
  { value: 'readonly', label: 'Lesetilgang', description: 'Kun lesing, for styret', icon: BookOpen, color: 'text-amber-600' },
];

export default function MemberRoleMenu({ member, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const ref = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRoleChange = async (role) => {
    const oldRole = member.club_role || 'player';
    await base44.entities.Member.update(member.id, { club_role: role });
    await base44.entities.AuditLog.create({
      club_id: member.club_id,
      action: 'change_role',
      entity_type: 'Member',
      entity_id: member.id,
      user_email: (await base44.auth.me()).email,
      details: `Rolle endret for ${member.full_name}: ${oldRole} → ${role}`,
      old_value: JSON.stringify({ club_role: oldRole }),
      new_value: JSON.stringify({ club_role: role }),
    });
    queryClient.invalidateQueries({ queryKey: ['members'] });
    const roleLabel = CLUB_ROLES.find(r => r.value === role)?.label || role;
    toast.success(`${member.full_name} er nå ${roleLabel}`);
    setOpen(false);
  };

  const currentRole = CLUB_ROLES.find(r => r.value === member.club_role) || CLUB_ROLES.find(r => r.value === 'player');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); setShowRoles(false); }}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        title="Handlinger"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 bg-popover border border-border rounded-2xl shadow-lg w-56 py-1 overflow-hidden">
          {!showRoles ? (
            <>
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Handlinger</p>
              </div>
              <button
                onClick={() => setShowRoles(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
              >
                <currentRole.icon className={`w-4 h-4 ${currentRole.color}`} />
                <div>
                  <p className="font-medium">Endre rolle</p>
                  <p className="text-xs text-muted-foreground">{currentRole.label}</p>
                </div>
              </button>
              <button
                onClick={() => { setOpen(false); onEdit(member); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
              >
                <Edit2 className="w-4 h-4 text-muted-foreground" />
                <span>Rediger info</span>
              </button>
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => { setOpen(false); if (confirm('Slette dette medlemmet?')) onDelete(member.id); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Slett medlem</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <button onClick={() => setShowRoles(false)} className="text-muted-foreground hover:text-foreground text-xs">← Tilbake</button>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Velg rolle</p>
              </div>
              {CLUB_ROLES.map((role) => {
                const isActive = (member.club_role || 'player') === role.value;
                return (
                  <button
                    key={role.value}
                    onClick={() => handleRoleChange(role.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left ${isActive ? 'bg-muted/40' : ''}`}
                  >
                    <role.icon className={`w-4 h-4 ${role.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isActive ? 'text-primary' : ''}`}>{role.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                    </div>
                    {isActive && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}