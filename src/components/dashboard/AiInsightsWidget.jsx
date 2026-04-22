import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNOK } from '@/lib/utils';

const icons = [TrendingUp, Lightbulb, AlertTriangle];
const iconColors = ['text-green-600', 'text-blue-600', 'text-yellow-600'];
const bgColors = ['bg-green-50 dark:bg-green-950/30', 'bg-blue-50 dark:bg-blue-950/30', 'bg-yellow-50 dark:bg-yellow-950/30'];

export default function AiInsightsWidget({ totalIncome, totalExpenses, unpaidTotal, unpaidCount = 0, overdueCount = 0 }) {
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
- Utestående betalinger: ${formatNOK(unpaidTotal)} (${unpaidCount} krav, ${overdueCount} forfalt)

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

  // Preview stats shown before analysis
  const hasData = totalIncome > 0 || totalExpenses > 0 || unpaidTotal > 0;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">AI Økonomiinnsikt</h3>
        </div>
        <Button
          size="sm"
          variant={insights ? 'outline' : 'default'}
          onClick={fetchInsights}
          disabled={loading}
          className="h-7 text-xs gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {insights ? 'Oppdater' : 'Analyser nå'}
        </Button>
      </div>

      {/* Pre-analysis preview */}
      {!insights && !loading && (
        <div className="space-y-2">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">
                <strong>{overdueCount} krav</strong> er forfalt — send purring nå
              </p>
            </div>
          )}
          {unpaidCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <TrendingUp className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>{formatNOK(unpaidTotal)}</strong> utestående totalt ({unpaidCount} krav)
              </p>
            </div>
          )}
          {!hasData && (
            <p className="text-xs text-muted-foreground text-center py-3">
              Klikk «Analyser nå» for AI-baserte innsikter om klubbens økonomi.
            </p>
          )}
          {hasData && (
            <button onClick={fetchInsights} className="w-full flex items-center justify-between p-2.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors">
              <span className="text-xs text-primary font-medium">Få personlige anbefalinger</span>
              <ChevronRight className="w-3.5 h-3.5 text-primary" />
            </button>
          )}
        </div>
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