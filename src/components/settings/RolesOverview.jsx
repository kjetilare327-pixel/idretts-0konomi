import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { CLUB_ROLES } from '@/components/members/MemberRoleMenu';
import { Users } from 'lucide-react';

export default function RolesOverview() {
  const { user } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-created_date', 500),
  });

  // Group members by role
  const byRole = CLUB_ROLES.map(role => ({
    ...role,
    members: members.filter(m => (m.club_role || 'player') === role.value),
  }));

  if (isLoading) return <div className="text-sm text-muted-foreground">Laster...</div>;

  return (
    <div className="space-y-3">
      {byRole.map(role => (
        <div key={role.value} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <role.icon className={`w-4 h-4 ${role.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">{role.label}</p>
              <p className="text-xs text-muted-foreground">{role.description}</p>
            </div>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {role.members.length} person{role.members.length !== 1 ? 'er' : ''}
            </span>
          </div>
          {role.members.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pl-11">
              {role.members.map(m => (
                <span key={m.id} className="text-xs bg-muted/60 text-foreground px-2 py-0.5 rounded-full">
                  {m.full_name}
                </span>
              ))}
            </div>
          )}
          {role.members.length === 0 && (
            <p className="text-xs text-muted-foreground pl-11">Ingen tildelt denne rollen ennå</p>
          )}
        </div>
      ))}
    </div>
  );
}