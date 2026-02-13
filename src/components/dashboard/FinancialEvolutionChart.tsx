import { useState, useMemo, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceDot 
} from 'recharts';
import SectionCard from './SectionCard';
import SemesterProjectionChart from './SemesterProjectionChart';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Calendar, BarChart3 } from 'lucide-react';
import type { ChartDataPoint } from '@/hooks/useFinancialSnapshot';
import type { SemesterBarData } from '@/hooks/useSemesterProjection';

export type EvolutionContextType = string | null;
type ChartView = 'daily' | 'semester';

interface FinancialEvolutionChartProps {
  data: ChartDataPoint[];
  activeContext?: EvolutionContextType;
  onContextChange?: (context: EvolutionContextType) => void;
  monthLabel: string;
  semesterData?: SemesterBarData[];
  semesterLoading?: boolean;
}

export default function FinancialEvolutionChart({ 
  data, activeContext, onContextChange, monthLabel,
  semesterData = [], semesterLoading = false,
}: FinancialEvolutionChartProps) {
  const [view, setView] = useState<ChartView>('daily');

  // ======== DAILY VIEW DATA ========
  const chartData = useMemo(() => {
    let prevRecebido = 0, prevAReceber = 0, prevDespesas = 0;
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
        recebidoDelta, aReceberDelta, despesasDelta,
      };
    });
  }, [data]);

  const activePointIndex = activeContext 
    ? chartData.findIndex(d => d.date === activeContext) : -1;

  const handleClick = useCallback((e: any) => {
    if (!onContextChange || !e?.activePayload?.[0]?.payload?.date) return;
    const clickedDate = e.activePayload[0].payload.date;
    onContextChange(clickedDate === activeContext ? null : clickedDate);
  }, [activeContext, onContextChange]);

  const handleReset = useCallback(() => onContextChange?.(null), [onContextChange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const dateStr = payload[0]?.payload?.date;
      const formattedDate = dateStr 
        ? format(parseISO(dateStr), "d 'de' MMMM", { locale: ptBR }) : label;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
          <p className="text-sm font-medium text-foreground mb-2 border-b border-border pb-2">
            {formattedDate}
          </p>
          {payload.map((entry: any, index: number) => {
            let delta = 0;
            if (entry.dataKey === 'recebido') delta = entry.payload.recebidoDelta;
            else if (entry.dataKey === 'a_receber') delta = entry.payload.aReceberDelta;
            else if (entry.dataKey === 'despesas') delta = entry.payload.despesasDelta;
            const sign = delta > 0 ? '+' : '';
            return (
              <div key={index} className="space-y-0.5 mb-2 last:mb-0">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}:</span>
                  <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
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

  const hasData = chartData.some(d => d.recebido > 0 || d.a_receber > 0 || d.despesas > 0);

  const getTitle = () => {
    if (view === 'semester') return 'Projeção Semestral';
    if (activeContext) return `Evolução até ${format(parseISO(activeContext), "dd/MM", { locale: ptBR })} | ${monthLabel}`;
    return `Evolução Financeira | ${monthLabel}`;
  };

  return (
    <SectionCard 
      title={getTitle()}
      action={
        <div className="flex items-center gap-2">
          {view === 'daily' && activeContext && (
            <Button variant="ghost" size="sm" onClick={handleReset}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3 mr-1" />Limpar
            </Button>
          )}
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ChartView)}
            size="sm" className="bg-muted/50 rounded-md p-0.5">
            <ToggleGroupItem value="daily" aria-label="Visão Diária" className="h-7 px-2.5 text-xs gap-1 data-[state=on]:bg-background data-[state=on]:shadow-sm">
              <Calendar className="h-3 w-3" />Diária
            </ToggleGroupItem>
            <ToggleGroupItem value="semester" aria-label="Visão Semestral" className="h-7 px-2.5 text-xs gap-1 data-[state=on]:bg-background data-[state=on]:shadow-sm">
              <BarChart3 className="h-3 w-3" />Semestral
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
    >
      <div className="h-[280px] w-full">
        {view === 'semester' ? (
          semesterLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Carregando projeção...
            </div>
          ) : (
            <SemesterProjectionChart data={semesterData} />
          )
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado financeiro para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              onClick={handleClick} className="cursor-pointer">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8}
                formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>} />
              <Line type="monotone" dataKey="recebido" name="Recebido" stroke="hsl(var(--success))"
                strokeWidth={2.5} dot={false} label={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }} />
              <Line type="monotone" dataKey="a_receber" name="A Receber" stroke="hsl(var(--warning))"
                strokeWidth={2.5} dot={false} label={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }} />
              <Line type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(var(--expense))"
                strokeWidth={2.5} dot={false} label={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }} />
              {activePointIndex >= 0 && chartData[activePointIndex] && (
                <>
                  <ReferenceDot x={chartData[activePointIndex].day} y={chartData[activePointIndex].recebido}
                    r={7} fill="hsl(var(--success))" stroke="hsl(var(--background))" strokeWidth={3} />
                  <ReferenceDot x={chartData[activePointIndex].day} y={chartData[activePointIndex].a_receber}
                    r={7} fill="hsl(var(--warning))" stroke="hsl(var(--background))" strokeWidth={3} />
                  <ReferenceDot x={chartData[activePointIndex].day} y={chartData[activePointIndex].despesas}
                    r={7} fill="hsl(var(--expense))" stroke="hsl(var(--background))" strokeWidth={3} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {view === 'daily' && hasData && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Clique em um ponto para filtrar até a data
        </p>
      )}
      {view === 'semester' && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Receitas confirmadas e despesas previstas para os próximos 6 meses
        </p>
      )}
    </SectionCard>
  );
}
