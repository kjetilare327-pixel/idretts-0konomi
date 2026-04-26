import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CATEGORIES } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'];

const formatNOK = (val) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(val);

export default function ExpensePieChart({ transactions }) {
  const expensesByCategory = {};

  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const label = CATEGORIES[t.category]?.label || t.category || 'Ukjent';
      expensesByCategory[label] = (expensesByCategory[label] || 0) + (t.amount || 0);
    });

  const data = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalExpenses = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-sm mb-4">Utgifter per kategori</h3>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Ingen utgifter registrert ennå
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0].payload;
    const pct = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm">
        <p className="font-medium">{name}</p>
        <p className="text-muted-foreground">{formatNOK(value)} ({pct}%)</p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-semibold text-sm mb-1">Utgifter per kategori</h3>
      <p className="text-xs text-muted-foreground mb-4">Totalt {formatNOK(totalExpenses)}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}