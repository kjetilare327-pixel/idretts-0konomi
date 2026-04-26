import React, { useState, useMemo } from 'react';
import { Search, Check, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ParticipantPicker({ members, selected, onChange }) {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');

  const teams = useMemo(() => {
    const t = new Set(members.map(m => m.team).filter(Boolean));
    return Array.from(t).sort();
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !search || m.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchTeam = teamFilter === 'all' || m.team === teamFilter;
      return matchSearch && matchTeam;
    });
  }, [members, search, teamFilter]);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const selectAll = () => {
    const filteredIds = filtered.map(m => m.id);
    const allSelected = filteredIds.every(id => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter(id => !filteredIds.includes(id)));
    } else {
      onChange([...new Set([...selected, ...filteredIds])]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Søk etter navn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {teams.length > 0 && (
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle lag</SelectItem>
              {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selected.length} valgt av {members.length} medlemmer
        </p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectAll}>
          <Users className="w-3 h-3 mr-1" />
          {filtered.every(m => selected.includes(m.id)) ? 'Fjern alle' : 'Velg alle'}
        </Button>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Ingen medlemmer funnet</p>
        )}
        {filtered.map(m => {
          const isSelected = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? 'border-primary bg-primary' : 'border-border'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.full_name}</p>
                {m.team && <p className="text-xs text-muted-foreground">{m.team}</p>}
              </div>
              {isSelected && <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0">Valgt</Badge>}
            </button>
          );
        })}
      </div>
    </div>
  );
}