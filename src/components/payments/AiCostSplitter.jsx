import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNOK } from '@/lib/utils';

export default function AiCostSplitter({ members = [], onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
                  <p className="text-sm font-bold">{result.antall_spillere}</p>
                </div>
                <div className="bg-accent/10 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Per spiller</p>
                  <p className="text-sm font-bold text-accent">{formatNOK(result.belop_per_spiller)}</p>
                </div>
              </div>
              {onApply && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => onApply(result)}
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