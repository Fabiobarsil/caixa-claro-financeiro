import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import type { SemesterBarData } from '@/hooks/useSemesterProjection';

interface SemesterProjectionChartProps {
  data: SemesterBarData[];
}

export default function SemesterProjectionChart({ data }: SemesterProjectionChartProps) {
  const hasData = useMemo(
    () => data.some(d => d.receitas > 0 || d.despesas > 0),
    [data]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="text-sm font-medium text-foreground mb-2 border-b border-border pb-2 capitalize">
            {label}
          </p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm mb-1 last:mb-0">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t border-border">
            <span className="text-muted-foreground">Saldo:</span>
            <span className={`font-semibold ${(payload[0]?.value || 0) - (payload[1]?.value || 0) >= 0 ? 'text-success' : 'text-expense'}`}>
              {formatCurrency((payload[0]?.value || 0) - (payload[1]?.value || 0))}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Nenhum dado disponível para projeção semestral
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString())}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value: string) => (
            <span className="text-sm text-muted-foreground">{value}</span>
          )}
        />
        <Bar
          dataKey="receitas"
          name="Receitas"
          fill="hsl(var(--success))"
          radius={[4, 4, 0, 0]}
          stackId="stack"
        />
        <Bar
          dataKey="despesas"
          name="Despesas"
          fill="hsl(var(--expense))"
          radius={[4, 4, 0, 0]}
          stackId="stack"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
