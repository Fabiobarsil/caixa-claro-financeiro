import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import SectionCard from './SectionCard';

interface DistributionChartProps {
  received: number;
  expenses: number;
  pending: number;
}

export default function DistributionChart({ received, expenses, pending }: DistributionChartProps) {
  const data = [
    { name: 'Recebido', value: received, color: 'hsl(var(--success))' },
    { name: 'Despesas', value: expenses, color: 'hsl(var(--expense))' },
    { name: 'A Receber', value: pending, color: 'hsl(var(--warning))' },
  ].filter(d => d.value > 0);

  const total = received + expenses + pending;

  if (total === 0) {
    return (
      <SectionCard title="Distribuição">
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem dados para exibir
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Distribuição">
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
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
