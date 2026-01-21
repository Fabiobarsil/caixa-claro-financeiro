import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyData {
  date: string;
  received: number;
  pending: number;
}

interface FinancialEvolutionChartProps {
  entries: Array<{
    id: string;
    value: number;
    status: 'pago' | 'pendente';
    date: string;
    payment_date: string | null;
  }>;
  selectedMonth: string;
}

export default function FinancialEvolutionChart({ entries, selectedMonth }: FinancialEvolutionChartProps) {
  const chartData = useMemo(() => {
    // Parse the selected month
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    
    // Get all days in the month
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Initialize daily data
    const dailyMap = new Map<string, DailyData>();
    daysInMonth.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      dailyMap.set(dateKey, {
        date: dateKey,
        received: 0,
        pending: 0,
      });
    });

    // Aggregate entries by day
    entries.forEach(entry => {
      // Use payment_date for received, date for pending
      const entryDate = entry.status === 'pago' && entry.payment_date 
        ? entry.payment_date 
        : entry.date;
      
      const dayData = dailyMap.get(entryDate);
      if (dayData) {
        if (entry.status === 'pago') {
          dayData.received += Number(entry.value);
        } else {
          dayData.pending += Number(entry.value);
        }
      }
    });

    // Calculate cumulative values
    let cumulativeReceived = 0;
    let cumulativePending = 0;
    
    return Array.from(dailyMap.values()).map(day => {
      cumulativeReceived += day.received;
      cumulativePending += day.pending;
      
      return {
        date: day.date,
        day: format(parseISO(day.date), 'd', { locale: ptBR }),
        received: cumulativeReceived,
        pending: cumulativePending,
        dailyReceived: day.received,
      };
    });
  }, [entries, selectedMonth]);

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

  return (
    <SectionCard title="Evolução Financeira" subtitle="Acumulado no mês">
      <div className="h-[280px] w-full">
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
              name="Pendente"
              stroke="hsl(var(--info))"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
