import { useCallback, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip,
  Sector
} from 'recharts';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { DistributionData } from '@/hooks/useFinancialSnapshot';

// Context types for filtering
export type DistributionContextType = 'recebido' | 'a_receber' | 'em_atraso' | null;

interface DistributionChartProps {
  distribution: DistributionData;
  activeContext?: DistributionContextType;
  onContextChange?: (context: DistributionContextType) => void;
  monthLabel: string;
}

// Map segment names to context types
const nameToContext: Record<string, DistributionContextType> = {
  'Recebido': 'recebido',
  'A Receber': 'a_receber',
  'Em Atraso': 'em_atraso',
};

// Active shape for selected segment
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-lg"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 8}
        outerRadius={innerRadius - 4}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

export default function DistributionChart({ 
  distribution,
  activeContext,
  onContextChange,
  monthLabel,
}: DistributionChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Usar dados do snapshot canônico
  const data = [
    { name: 'Recebido', value: distribution.recebido, color: 'hsl(var(--success))' },
    { name: 'A Receber', value: distribution.a_receber, color: 'hsl(var(--warning))' },
    { name: 'Em Atraso', value: distribution.em_atraso, color: 'hsl(var(--expense))' },
  ].filter(d => d.value > 0);

  // total_entradas do snapshot
  const total = distribution.recebido + distribution.a_receber + distribution.em_atraso;

  // Find active index based on context
  const activeIndex = activeContext 
    ? data.findIndex(d => nameToContext[d.name] === activeContext)
    : -1;

  const handleClick = useCallback((data: any, index: number) => {
    if (!onContextChange) return;
    
    const clickedContext = nameToContext[data.name];
    // Toggle: if clicking the same, clear context
    if (clickedContext === activeContext) {
      onContextChange(null);
    } else {
      onContextChange(clickedContext);
    }
  }, [activeContext, onContextChange]);

  const handleReset = useCallback(() => {
    onContextChange?.(null);
  }, [onContextChange]);

  // Custom tooltip with enhanced info
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="text-sm font-medium text-foreground mb-1">{item.name}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Percentual:</span>
              <span className="font-medium">{percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Dynamic title based on context and time window
  const getTitle = () => {
    let title = 'Distribuição';
    if (activeContext) {
      const contextLabel = data.find(d => nameToContext[d.name] === activeContext)?.name || '';
      title = `Distribuição — ${contextLabel}`;
    }
    return `${title} | ${monthLabel}`;
  };

  if (total === 0) {
    return (
      <SectionCard 
        title={`Distribuição | ${monthLabel}`}
      >
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem dados para exibir
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard 
      title={getTitle()}
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
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              activeIndex={activeIndex >= 0 ? activeIndex : undefined}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={handleClick}
              className="cursor-pointer focus:outline-none"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  opacity={activeIndex >= 0 && activeIndex !== index ? 0.4 : 1}
                  className="transition-opacity duration-200"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => (
                <span 
                  className={`text-xs cursor-pointer transition-opacity duration-200 ${
                    activeIndex >= 0 && nameToContext[value] !== activeContext 
                      ? 'opacity-50' 
                      : 'text-foreground'
                  }`}
                  onClick={() => {
                    const context = nameToContext[value];
                    if (context === activeContext) {
                      onContextChange?.(null);
                    } else {
                      onContextChange?.(context);
                    }
                  }}
                >
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        Clique em um segmento para filtrar os dados
      </p>
    </SectionCard>
  );
}
