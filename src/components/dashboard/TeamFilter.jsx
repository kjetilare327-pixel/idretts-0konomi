import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

export default function TeamFilter({ teams, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Alle lag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle lag</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team} value={team}>{team}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}