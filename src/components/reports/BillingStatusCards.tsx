import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusItem {
  label: string;
  count: number;
  total: number;
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
}

interface BillingStatusCardsProps {
  pagos: { count: number; total: number };
  pendentes: { count: number; total: number };
  atrasados: { count: number; total: number };
}

export default function BillingStatusCards({ pagos, pendentes, atrasados }: BillingStatusCardsProps) {
  const items: StatusItem[] = [
    { label: 'Pagos', ...pagos, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Pendentes', ...pendentes, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Atrasados', ...atrasados, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Situação das Cobranças</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.label} className="text-center">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2', item.bg)}>
                <item.icon size={20} className={item.color} />
              </div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold">{item.count}</p>
              <p className={cn('text-sm font-semibold', item.color)}>{formatCurrency(item.total)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
