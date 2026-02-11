import { useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import type { ExpenseCategoryData } from '@/hooks/useFinancialSnapshot';

const COLORS = [
  'hsl(var(--expense))',
  'hsl(var(--warning))',
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--accent-foreground))',
  'hsl(var(--muted-foreground))',
  'hsl(210, 60%, 50%)',
  'hsl(280, 50%, 55%)',
];

interface DistributionChartProps {
  expensesByCategory: ExpenseCategoryData[];
  monthLabel: string;
}

export default function DistributionChart({ 
  expensesByCategory,
  monthLabel,
}: DistributionChartProps) {
  const total = expensesByCategory.reduce((sum, d) => sum + d.value, 0);

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

  if (total === 0) {
    return (
      <SectionCard title={`Despesas por Categoria | ${monthLabel}`}>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem despesas neste mês
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`Despesas por Categoria | ${monthLabel}`}>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={expensesByCategory}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {expensesByCategory.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Distribuição das despesas por categoria no mês
      </p>
    </SectionCard>
  );
}
