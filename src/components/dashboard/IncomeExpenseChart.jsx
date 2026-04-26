import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line, ComposedChart, Area
} from 'recharts';
import { formatNOK } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry, i) => {
        const labels = { income: 'Inntekt', expense: 'Utgift', net: 'Netto' };
        return (
          <p key={i} style={{ color: entry.color }}>
            {labels[entry.dataKey] || entry.name}: {formatNOK(entry.value)}
          </p>
        );
      })}
    </div>
  );
};

export default function IncomeExpenseChart({ transactions }) {
  const [view, setView] = useState('bars'); // 'bars' | 'net'

  const chartData = MONTHS.map((month, idx) => {
    const monthTx = (transactions || []).filter(t => new Date(t.date).getMonth() === idx);
    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    return { month, income, expense, net: income - expense };
  });

  // Only show months up to current month
  const currentMonth = new Date().getMonth();
  const visibleData = chartData.slice(0, currentMonth + 1);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Inntekter vs. utgifter</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView('bars')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === 'bars' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Månedlig
          </button>
          <button
            onClick={() => setView('net')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === 'net' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Netto
          </button>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'bars' ? (
            <BarChart data={visibleData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Inntekt" />
              <Bar dataKey="expense" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Utgift" />
            </BarChart>
          ) : (
            <ComposedChart data={visibleData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="net"
                fill="hsl(var(--chart-2) / 0.2)"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--chart-2))' }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        {view === 'bars' ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(var(--chart-1))' }} />
              Inntekter
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(var(--chart-3))' }} />
              Utgifter
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(var(--chart-2))' }} />
            Netto resultat
          </div>
        )}
      </div>
    </div>
  );
}