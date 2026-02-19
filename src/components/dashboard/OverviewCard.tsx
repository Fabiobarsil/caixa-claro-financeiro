import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import type { FinancialSnapshot } from '@/hooks/useFinancialSnapshot';

interface OverviewCardProps {
  snapshot: FinancialSnapshot;
}

export default function OverviewCard({ snapshot }: OverviewCardProps) {
  const entrou = snapshot.recebido;
  const saiu = snapshot.despesas_pagas;
  const sobrou = snapshot.lucro_real;

  const chartData = [
    { name: 'Entrou', value: entrou || 0.01 },
    { name: 'Saiu', value: saiu || 0.01 },
  ];

  const COLORS = ['#22c55e', '#ef4444'];

  return (
    <SectionCard title="Visão Geral" subtitle="Entrou × Saiu neste mês">
      <div className="grid grid-cols-2 gap-4">
        {/* Left: metrics */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
              <ArrowDownCircle size={16} className="text-[#22c55e]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entrou</p>
              <p className="text-sm font-bold text-[#22c55e]">{formatCurrency(entrou)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
              <ArrowUpCircle size={16} className="text-[#ef4444]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saiu</p>
              <p className="text-sm font-bold text-[#ef4444]">{formatCurrency(saiu)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Wallet size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sobrou</p>
              <p className={`text-sm font-bold ${sobrou >= 0 ? 'text-blue-500' : 'text-[#ef4444]'}`}>
                {formatCurrency(sobrou)}
              </p>
            </div>
          </div>
        </div>

        {/* Right: donut chart */}
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionCard>
  );
}
