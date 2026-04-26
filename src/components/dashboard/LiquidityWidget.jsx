import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { formatNOK } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const LOW_BUFFER = 5000;

export default function LiquidityWidget() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];

  const { data: entries = [] } = useQuery({
    queryKey: ['liquidity', club?.id, currentYear],
    queryFn: () => base44.entities.LiquidityEntry.filter({ club_id: club.id, year: currentYear }),
    enabled: !!club?.id,
  });

  const chartData = useMemo(() => {
    let runningBalance = 0;
    return MONTHS.slice(currentMonth, currentMonth + 6).map((name, i) => {
      const month = currentMonth + i + 1;
      const monthEntries = entries.filter(e => e.month === month);
      const income = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
      const expense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
      runningBalance += income - expense;
      return { name, balance: runningBalance };
    });
  }, [entries, currentMonth]);

  if (entries.length === 0) return null;

  const finalBalance = chartData[chartData.length - 1]?.balance ?? 0;
  const hasNegative = chartData.some(d => d.balance < 0);
  const hasLow = !hasNegative && chartData.some(d => d.balance < LOW_BUFFER);

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Likviditetsprognose</h3>
          <span className="text-xs text-muted-foreground">– neste 6 mnd</span>
        </div>
        {hasNegative && (
          <div className="flex items-center gap-1 text-xs text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" /> Forventet underskudd
          </div>
        )}
        {hasLow && !hasNegative && (
          <div className="flex items-center gap-1 text-xs text-warning font-medium bg-warning/10 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" /> Lav buffer
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="liqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={hasNegative ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'} stopOpacity={0.25} />
              <stop offset="95%" stopColor={hasNegative ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            formatter={(v) => [formatNOK(v), 'Forventet saldo']}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={hasNegative ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'}
            fill="url(#liqGrad)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Forventet saldo om 6 mnd:</span>
        <span className={`font-semibold text-sm ${finalBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
          {formatNOK(finalBalance)}
        </span>
      </div>
    </div>
  );
}