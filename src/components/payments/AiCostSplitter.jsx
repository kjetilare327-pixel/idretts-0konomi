import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNOK } from '@/lib/utils';

export default function AiCostSplitter({ members = [], onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const toggleMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedMemberIds(members.map(m => m.id));
  const clearAll = () => setSelectedMemberIds([]);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du er en klubbadministrator. Analyser følgende kostnadsbeskrivelse og returner strukturert data.

Beskrivelse: "${text}"

Identifiser:
1. Totalbeløp i NOK
2. Antall spillere (eller antall nevnt)
3. Beløp per spiller (totalbeløp / antall spillere)

Returnér KUN JSON, ingen annen tekst.`,
      response_json_schema: {
        type: 'object',
        properties: {
          total_belop: { type: 'number' },
          antall_spillere: { type: 'number' },
          belop_per_spiller: { type: 'number' },
          beskrivelse: { type: 'string' },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/20 p-4">
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">AI – Fordel kostnad automatisk</span>
        {open ? <ChevronUp className="w-4 h-4 ml-auto text-muted-foreground" /> : <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Beskriv kostnaden naturlig, f.eks. «2000 kr på mat til 5 spillere»</p>
          <div className="flex gap-2">
            <Input
              placeholder="2000 kr på mat til 5 spillere..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAnalyze} disabled={loading || !text.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>

          {/* Member selector */}
          {members.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-foreground">Velg spillere det gjelder</p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-[10px] text-primary hover:underline">Velg alle</button>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:underline">Fjern alle</button>
                </div>
              </div>
              <div className="max-h-36 overflow-y-auto grid grid-cols-2 gap-1 pr-1">
                {members.filter(m => m.status !== 'inactive').map((m) => {
                  const selected = selectedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMember(m.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left text-xs transition-colors ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${selected ? 'bg-primary' : 'bg-muted'}`}>
                        {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <span className="truncate">{m.full_name}</span>
                    </button>
                  );
                })}
              </div>
              {selectedMemberIds.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">{selectedMemberIds.length} spiller(e) valgt</p>
              )}
            </div>
          )}

          {result && (
            <div className="bg-card rounded-lg border p-3 space-y-2">
              {result.beskrivelse && (
                <p className="text-xs text-muted-foreground">{result.beskrivelse}</p>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Totalt</p>
                  <p className="text-sm font-bold">{formatNOK(result.total_belop)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Spillere</p>
                  <p className="text-sm font-bold">{selectedMemberIds.length || result.antall_spillere}</p>
                </div>
                <div className="bg-accent/10 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Per spiller</p>
                  <p className="text-sm font-bold text-accent">
                    {formatNOK(selectedMemberIds.length > 0
                      ? result.total_belop / selectedMemberIds.length
                      : result.belop_per_spiller)}
                  </p>
                </div>
              </div>
              {onApply && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => onApply({ ...result, member_ids: selectedMemberIds, belop_per_spiller: selectedMemberIds.length > 0 ? result.total_belop / selectedMemberIds.length : result.belop_per_spiller })}
                >
                  Bruk disse verdiene
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}