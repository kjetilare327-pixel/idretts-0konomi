import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNOK } from '@/lib/utils';

const icons = [TrendingUp, Lightbulb, AlertTriangle];
const iconColors = ['text-green-600', 'text-blue-600', 'text-yellow-600'];
const bgColors = ['bg-green-50 dark:bg-green-950/30', 'bg-blue-50 dark:bg-blue-950/30', 'bg-yellow-50 dark:bg-yellow-950/30'];

export default function AiInsightsWidget({ totalIncome, totalExpenses, unpaidTotal }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du er en økonomiekspert for idrettslag. Analyser følgende tall og gi 3 korte, konkrete og handlingsbaserte innsikter på norsk.

Økonomidata:
- Inntekter i år: ${formatNOK(totalIncome)}
- Utgifter i år: ${formatNOK(totalExpenses)}
- Netto: ${formatNOK(totalIncome - totalExpenses)}
- Utestående betalinger: ${formatNOK(unpaidTotal)}

Regler:
- Hver innsikt skal være maks 2 setninger
- Fokuser på konkrete handlinger klubben bør ta
- Vær direkte og konstruktiv, ikke generisk
- Bruk norsk`,
      response_json_schema: {
        type: 'object',
        properties: {
          innsikter: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tittel: { type: 'string' },
                tekst: { type: 'string' },
              },
            },
          },
        },
      },
    });
    setInsights(res?.innsikter || []);
    setLoading(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Økonomiinnsikt</h3>
        </div>
        <Button
          size="sm"
          variant={insights ? 'outline' : 'default'}
          onClick={fetchInsights}
          disabled={loading}
          className="h-7 text-xs"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {insights ? 'Oppdater' : 'Analyser'}
        </Button>
      </div>

      {!insights && !loading && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Klikk «Analyser» for å få AI-baserte innsikter om klubbens økonomi.
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyserer økonomi...
        </div>
      )}

      {insights && (
        <div className="space-y-2">
          {insights.slice(0, 3).map((insight, i) => {
            const Icon = icons[i] || Lightbulb;
            return (
              <div key={i} className={`rounded-lg p-3 ${bgColors[i]}`}>
                <div className="flex gap-2">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors[i]}`} />
                  <div>
                    <p className={`text-xs font-semibold ${iconColors[i]}`}>{insight.tittel}</p>
                    <p className="text-xs text-foreground mt-0.5 leading-relaxed">{insight.tekst}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}