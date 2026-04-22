import React, { useState } from 'react';
import { Calculator, Plus, Trash2, TrendingUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatNOK } from '@/lib/utils';

const TEMPLATES = [
  { label: 'Loddsalg', description: 'Lodd à kr', unit: 'lodd', unitPrice: 50, quantity: 500 },
  { label: 'Bingo', description: 'Spillere à kr', unit: 'spillere', unitPrice: 100, quantity: 50 },
  { label: 'Basar', description: 'Billetter à kr', unit: 'billetter', unitPrice: 100, quantity: 200 },
  { label: 'Vaffelsal', description: 'Vafler à kr', unit: 'vafler', unitPrice: 30, quantity: 100 },
  { label: 'Kakesalg', description: 'Kaker à kr', unit: 'kaker', unitPrice: 150, quantity: 30 },
];

function parseLine(line) {
  // Parse "1000 lodd à 50 kr" or similar
  const match = line.match(/(\d+)\s+\w+\s+à\s+(\d+)/i);
  if (match) return parseInt(match[1]) * parseInt(match[2]);
  // Parse "50 * 1000" or "1000 * 50"
  const mul = line.match(/(\d+)\s*[x*×]\s*(\d+)/i);
  if (mul) return parseInt(mul[1]) * parseInt(mul[2]);
  return null;
}

export default function Dugnad() {
  const [activities, setActivities] = useState([
    { id: 1, name: 'Loddsalg', quantity: 1000, unitPrice: 50, cost: 200, description: '' },
  ]);
  const [quickInput, setQuickInput] = useState('');
  const [quickResult, setQuickResult] = useState(null);

  const addActivity = () => {
    setActivities(prev => [...prev, {
      id: Date.now(), name: 'Ny aktivitet', quantity: 100, unitPrice: 50, cost: 0, description: ''
    }]);
  };

  const removeActivity = (id) => setActivities(prev => prev.filter(a => a.id !== id));

  const updateActivity = (id, field, value) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const applyTemplate = (tpl) => {
    setActivities(prev => [...prev, {
      id: Date.now(), name: tpl.label, quantity: tpl.quantity, unitPrice: tpl.unitPrice, cost: 0, description: tpl.description
    }]);
  };

  const handleQuickInput = (val) => {
    setQuickInput(val);
    const result = parseLine(val);
    setQuickResult(result);
  };

  const totalRevenue = activities.reduce((s, a) => s + (a.quantity * a.unitPrice), 0);
  const totalCost = activities.reduce((s, a) => s + Number(a.cost || 0), 0);
  const netResult = totalRevenue - totalCost;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Dugnads-kalkulator</h1>
        <p className="text-sm text-muted-foreground mt-1">Beregn inntekter fra dugnad og se budsjetteffekt</p>
      </div>

      {/* Quick calculator */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Hurtigkalkulator</h3>
          <span className="text-xs text-muted-foreground">Skriv f.eks. "1000 lodd à 50 kr"</span>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              placeholder='f.eks. "500 lodd à 50 kr" eller "200 × 30"'
              value={quickInput}
              onChange={(e) => handleQuickInput(e.target.value)}
            />
          </div>
          {quickResult !== null && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 whitespace-nowrap font-bold">
              = {formatNOK(quickResult)}
            </div>
          )}
        </div>
      </div>

      {/* Templates */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Legg til aktivitet fra mal</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => applyTemplate(tpl)}
              className="px-3 py-1.5 text-sm border border-dashed border-border rounded-lg hover:bg-muted hover:border-primary transition-colors"
            >
              + {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="space-y-3">
        {activities.map((a) => {
          const revenue = a.quantity * a.unitPrice;
          const net = revenue - Number(a.cost || 0);
          return (
            <div key={a.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs">Aktivitet</Label>
                    <Input
                      value={a.name}
                      onChange={(e) => updateActivity(a.id, 'name', e.target.value)}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Antall</Label>
                    <Input
                      type="number" min="0"
                      value={a.quantity}
                      onChange={(e) => updateActivity(a.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pris per stk (kr)</Label>
                    <Input
                      type="number" min="0"
                      value={a.unitPrice}
                      onChange={(e) => updateActivity(a.id, 'unitPrice', parseInt(e.target.value) || 0)}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kostnader (kr)</Label>
                    <Input
                      type="number" min="0"
                      value={a.cost}
                      onChange={(e) => updateActivity(a.id, 'cost', e.target.value)}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeActivity(a.id)}
                  className="text-muted-foreground hover:text-destructive mt-6 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Bruttoinntekt: <strong>{formatNOK(revenue)}</strong></span>
                <span className="text-xs text-muted-foreground">Netto: <strong className={net >= 0 ? 'text-green-600' : 'text-red-600'}>{formatNOK(net)}</strong></span>
              </div>
            </div>
          );
        })}
        <Button variant="outline" onClick={addActivity} className="w-full">
          <Plus className="w-4 h-4 mr-2" /> Legg til aktivitet
        </Button>
      </div>

      {/* Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Budsjetteffekt</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Totale inntekter</p>
            <p className="text-lg font-bold text-green-600">{formatNOK(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Totale kostnader</p>
            <p className="text-lg font-bold text-red-600">{formatNOK(totalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Netto bidrag</p>
            <p className={`text-lg font-bold ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNOK(netResult)}</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-background rounded-lg border border-border flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Dette er et planleggingsverktøy — tallene påvirker ikke regnskapet automatisk. 
            Registrer faktiske inntekter under <strong>Transaksjoner</strong> når dugnaden er gjennomført.
          </p>
        </div>
      </div>
    </div>
  );
}