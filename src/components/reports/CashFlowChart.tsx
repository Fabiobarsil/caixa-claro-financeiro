import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface CashFlowDataPoint {
  day: string;
  entradas: number;
  saidas: number;
}

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Fluxo de Caixa</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Sem dados para o período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name === 'entradas' ? 'Entradas' : 'Saídas']}
                labelFormatter={(label) => `Dia ${label}`}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <Legend
                formatter={(value) => (value === 'entradas' ? 'Entradas' : 'Saídas')}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
