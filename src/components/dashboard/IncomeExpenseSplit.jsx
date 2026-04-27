import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNOK } from '@/lib/utils';

const COLORS = {
  income: '#10b981',
  expense: '#ef4444',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{name}</p>
      <p className="text-muted-foreground">{formatNOK(value)}</p>
    </div>
  );
};

export default function IncomeExpenseSplit({ transactions }) {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const total = totalIncome + totalExpense;

  if (total === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-sm mb-4">Inntekter vs. utgifter</h3>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Ingen transaksjoner registrert ennå
        </div>
      </div>
    );
  }

  const data = [
    { name: 'Inntekter', value: totalIncome, color: COLORS.income },
    { name: 'Utgifter', value: totalExpense, color: COLORS.expense },
  ];

  const incomePct = total > 0 ? ((totalIncome / total) * 100).toFixed(1) : 0;
  const expensePct = total > 0 ? ((totalExpense / total) * 100).toFixed(1) : 0;
  const net = totalIncome - totalExpense;

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-semibold text-sm mb-1">Inntekter vs. utgifter</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Netto: <span className={net >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{formatNOK(net)}</span>
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
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

      {/* Summary rows */}
      <div className="space-y-2 mt-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Inntekter</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-green-600">{formatNOK(totalIncome)}</span>
            <span className="text-xs text-muted-foreground ml-1">({incomePct}%)</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Utgifter</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-red-600">{formatNOK(totalExpense)}</span>
            <span className="text-xs text-muted-foreground ml-1">({expensePct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}