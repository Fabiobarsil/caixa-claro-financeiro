import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ChartDataPoint } from '@/hooks/useDashboard';

interface FinancialEvolutionChartProps {
  data: ChartDataPoint[];
}

export default function FinancialEvolutionChart({ data }: FinancialEvolutionChartProps) {
  const chartData = useMemo(() => {
    // Calculate cumulative values
    let cumulativeReceived = 0;
    let cumulativePending = 0;
    let cumulativeOverdue = 0;
    
    return data.map(day => {
      cumulativeReceived += day.received;
      cumulativePending += day.pending;
      cumulativeOverdue += day.overdue;
      
      return {
        date: day.date,
        day: format(parseISO(day.date), 'd', { locale: ptBR }),
        received: cumulativeReceived,
        pending: cumulativePending,
        overdue: cumulativeOverdue,
      };
    });
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateStr = payload[0]?.payload?.date;
      const formattedDate = dateStr 
        ? format(parseISO(dateStr), "d 'de' MMMM", { locale: ptBR })
        : label;
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground mb-2">{formattedDate}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Check if there's any data to show
  const hasData = chartData.some(d => d.received > 0 || d.pending > 0 || d.overdue > 0);

  return (
    <SectionCard title="Evolução Financeira" subtitle="Acumulado no mês">
      <div className="h-[280px] w-full">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado financeiro para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
              />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => {
                  if (value >= 1000) {
                    return `${(value / 1000).toFixed(0)}k`;
                  }
                  return value.toString();
                }}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="received"
                name="Recebido"
                stroke="hsl(var(--success))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="pending"
                name="A vencer"
                stroke="hsl(var(--warning))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="overdue"
                name="Em atraso"
                stroke="hsl(var(--expense))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </SectionCard>
  );
}
