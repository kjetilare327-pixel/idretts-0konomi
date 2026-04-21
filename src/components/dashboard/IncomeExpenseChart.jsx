import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

export default function IncomeExpenseChart({ transactions }) {
  const chartData = MONTHS.map((month, idx) => {
    const monthTx = (transactions || []).filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === idx;
    });
    return {
      month,
      income: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
      expense: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name === 'income' ? 'Inntekt' : 'Utgift'}: kr {entry.value?.toLocaleString('nb-NO')}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-base font-semibold mb-4">Inntekter vs. utgifter</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="income" />
            <Bar dataKey="expense" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="expense" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(var(--chart-1))' }} />
          Inntekter
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(var(--chart-3))' }} />
          Utgifter
        </div>
      </div>
    </div>
  );
}