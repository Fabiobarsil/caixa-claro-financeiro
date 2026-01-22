import { useMemo, useCallback } from 'react';
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
import TimeWindowSelector from './TimeWindowSelector';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X } from 'lucide-react';
import type { TimeWindow, ChartDataPoint } from '@/hooks/useFinancialSnapshot';

// Context type for filtering
export type EvolutionContextType = string | null; // Date string or null

interface FinancialEvolutionChartProps {
  data: ChartDataPoint[];
  activeContext?: EvolutionContextType;
  onContextChange?: (context: EvolutionContextType) => void;
  timeWindow: TimeWindow;
  onTimeWindowChange: (window: TimeWindow) => void;
}

export default function FinancialEvolutionChart({ 
  data,
  activeContext,
  onContextChange,
  timeWindow,
  onTimeWindowChange
}: FinancialEvolutionChartProps) {
  // Os dados já vêm acumulados do snapshot, apenas formatar para exibição
  const chartData = useMemo(() => {
    let prevRecebido = 0;
    let prevAReceber = 0;
    let prevDespesas = 0;
    
    return data.map((day) => {
      const recebidoDelta = day.recebido - prevRecebido;
      const aReceberDelta = day.a_receber - prevAReceber;
      const despesasDelta = day.despesas - prevDespesas;
      
      prevRecebido = day.recebido;
      prevAReceber = day.a_receber;
      prevDespesas = day.despesas;
      
      return {
        date: day.date,
        day: format(parseISO(day.date), 'd/M', { locale: ptBR }),
        recebido: day.recebido,
        a_receber: day.a_receber,
        despesas: day.despesas,
        // Delta diário
        recebidoDelta,
        aReceberDelta,
        despesasDelta,
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
      
      const recebidoDelta = payload[0]?.payload?.recebidoDelta || 0;
      const aReceberDelta = payload[0]?.payload?.aReceberDelta || 0;
      const despesasDelta = payload[0]?.payload?.despesasDelta || 0;
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
          <p className="text-sm font-medium text-foreground mb-2 border-b border-border pb-2">
            {formattedDate}
          </p>
          {payload.map((entry: any, index: number) => {
            let delta = 0;
            if (entry.dataKey === 'recebido') delta = recebidoDelta;
            else if (entry.dataKey === 'a_receber') delta = aReceberDelta;
            else if (entry.dataKey === 'despesas') delta = despesasDelta;
            
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
                    <span className={delta > 0 ? (entry.dataKey === 'despesas' ? 'text-expense' : 'text-success') : 'text-muted-foreground'}>
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
  const hasData = chartData.some(d => d.recebido > 0 || d.a_receber > 0 || d.despesas > 0);

  // Dynamic title based on context and time window
  const getTitle = () => {
    if (activeContext) {
      return `Evolução até ${format(parseISO(activeContext), "dd/MM", { locale: ptBR })} | últimos ${timeWindow} dias`;
    }
    return `Evolução Financeira | últimos ${timeWindow} dias`;
  };

  return (
    <SectionCard 
      title={getTitle()}
      headerContent={
        <TimeWindowSelector value={timeWindow} onChange={onTimeWindowChange} />
      }
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
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
                dataKey="recebido"
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
                dataKey="a_receber"
                name="A Receber"
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
                dataKey="despesas"
                name="Despesas"
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
                    y={chartData[activePointIndex].recebido}
                    r={8}
                    fill="hsl(var(--success))"
                    stroke="hsl(var(--background))"
                    strokeWidth={3}
                  />
                  <ReferenceDot
                    x={chartData[activePointIndex].day}
                    y={chartData[activePointIndex].a_receber}
                    r={8}
                    fill="hsl(var(--warning))"
                    stroke="hsl(var(--background))"
                    strokeWidth={3}
                  />
                  <ReferenceDot
                    x={chartData[activePointIndex].day}
                    y={chartData[activePointIndex].despesas}
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
