import { useMemo, useCallback, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceDot
} from 'recharts';
import SectionCard from './SectionCard';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X } from 'lucide-react';
import type { ChartDataPoint } from '@/hooks/useDashboard';
import type { EvolutionContextType } from '@/hooks/useChartContext';

interface FinancialEvolutionChartProps {
  data: ChartDataPoint[];
  activeContext?: EvolutionContextType;
  onContextChange?: (context: EvolutionContextType) => void;
}

export default function FinancialEvolutionChart({ 
  data,
  activeContext,
  onContextChange 
}: FinancialEvolutionChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  const chartData = useMemo(() => {
    // Calculate cumulative values and day-over-day variation
    let cumulativeReceived = 0;
    let cumulativePending = 0;
    let cumulativeOverdue = 0;
    
    return data.map((day, index) => {
      const prevReceived = cumulativeReceived;
      const prevPending = cumulativePending;
      const prevOverdue = cumulativeOverdue;
      
      cumulativeReceived += day.received;
      cumulativePending += day.pending;
      cumulativeOverdue += day.overdue;
      
      return {
        date: day.date,
        day: format(parseISO(day.date), 'd', { locale: ptBR }),
        received: cumulativeReceived,
        pending: cumulativePending,
        overdue: cumulativeOverdue,
        // Day-over-day variations
        receivedDelta: day.received,
        pendingDelta: day.pending,
        overdueDelta: day.overdue,
        // Previous values for comparison
        prevReceived,
        prevPending,
        prevOverdue,
      };
    });
  }, [data]);

  // Find index of active point
  const activePointIndex = activeContext 
    ? chartData.findIndex(d => d.date === activeContext)
    : -1;

  const handleClick = useCallback((e: any) => {
    if (!onContextChange || !e?.activePayload?.[0]?.payload?.date) return;
    
    const clickedDate = e.activePayload[0].payload.date;
    // Toggle: if clicking the same date, clear context
    if (clickedDate === activeContext) {
      onContextChange(null);
    } else {
      onContextChange(clickedDate);
    }
  }, [activeContext, onContextChange]);

  const handleReset = useCallback(() => {
    onContextChange?.(null);
  }, [onContextChange]);

  // Enhanced custom tooltip with day-over-day variation
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateStr = payload[0]?.payload?.date;
      const formattedDate = dateStr 
        ? format(parseISO(dateStr), "d 'de' MMMM", { locale: ptBR })
        : label;
      
      const receivedDelta = payload[0]?.payload?.receivedDelta || 0;
      const pendingDelta = payload[0]?.payload?.pendingDelta || 0;
      const overdueDelta = payload[0]?.payload?.overdueDelta || 0;
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
          <p className="text-sm font-medium text-foreground mb-2 border-b border-border pb-2">
            {formattedDate}
          </p>
          {payload.map((entry: any, index: number) => {
            const delta = index === 0 ? receivedDelta : index === 1 ? pendingDelta : overdueDelta;
            const sign = delta > 0 ? '+' : '';
            
            return (
              <div key={index} className="space-y-0.5 mb-2 last:mb-0">
                <div className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}:</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(entry.value)}
                  </span>
                </div>
                {delta !== 0 && (
                  <div className="flex items-center gap-2 text-xs ml-4">
                    <span className={delta > 0 ? 'text-success' : 'text-expense'}>
                      {sign}{formatCurrency(delta)} no dia
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
            Clique para filtrar até esta data
          </p>
        </div>
      );
    }
    return null;
  };

  // Check if there's any data to show
  const hasData = chartData.some(d => d.received > 0 || d.pending > 0 || d.overdue > 0);

  // Dynamic title based on context
  const title = activeContext 
    ? `Evolução até ${format(parseISO(activeContext), "dd/MM", { locale: ptBR })}`
    : 'Evolução Financeira';

  return (
    <SectionCard 
      title={title} 
      subtitle={activeContext ? undefined : "Acumulado no mês"}
      action={activeContext && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Limpar seleção
        </Button>
      )}
    >
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
              onClick={handleClick}
              className="cursor-pointer"
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
                activeDot={{ 
                  r: 6, 
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                  className: 'drop-shadow-md'
                }}
              />
              <Line
                type="monotone"
                dataKey="pending"
                name="A vencer"
                stroke="hsl(var(--warning))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ 
                  r: 6, 
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                  className: 'drop-shadow-md'
                }}
              />
              <Line
                type="monotone"
                dataKey="overdue"
                name="Em atraso"
                stroke="hsl(var(--expense))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ 
                  r: 6, 
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                  className: 'drop-shadow-md'
                }}
              />
              
              {/* Active selection indicator */}
              {activePointIndex >= 0 && chartData[activePointIndex] && (
                <>
                  <ReferenceDot
                    x={chartData[activePointIndex].day}
                    y={chartData[activePointIndex].received}
                    r={8}
                    fill="hsl(var(--success))"
                    stroke="hsl(var(--background))"
                    strokeWidth={3}
                  />
                  <ReferenceDot
                    x={chartData[activePointIndex].day}
                    y={chartData[activePointIndex].pending}
                    r={8}
                    fill="hsl(var(--warning))"
                    stroke="hsl(var(--background))"
                    strokeWidth={3}
                  />
                  <ReferenceDot
                    x={chartData[activePointIndex].day}
                    y={chartData[activePointIndex].overdue}
                    r={8}
                    fill="hsl(var(--expense))"
                    stroke="hsl(var(--background))"
                    strokeWidth={3}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Help text */}
      {hasData && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Clique em um ponto para filtrar até a data
        </p>
      )}
    </SectionCard>
  );
}
