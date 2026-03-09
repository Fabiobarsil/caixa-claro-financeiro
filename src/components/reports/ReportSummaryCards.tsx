import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportSummaryCardsProps {
  recebido: number;
  aReceber: number;
  despesas: number;
}

const cards = [
  { key: 'recebido', label: 'Recebido', icon: DollarSign, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  { key: 'aReceber', label: 'A Receber', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { key: 'despesas', label: 'Despesas', icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  { key: 'saldo', label: 'Saldo do Período', icon: Wallet, color: '', bg: '', border: '' },
] as const;

export default function ReportSummaryCards({ recebido, aReceber, despesas }: ReportSummaryCardsProps) {
  const saldo = recebido - despesas;
  const values = { recebido, aReceber, despesas, saldo };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const value = values[card.key];
        const isSaldo = card.key === 'saldo';
        const saldoPositive = isSaldo && value >= 0;
        const colorClass = isSaldo ? (saldoPositive ? 'text-success' : 'text-destructive') : card.color;
        const bgClass = isSaldo ? (saldoPositive ? 'bg-success/10' : 'bg-destructive/10') : card.bg;
        const borderClass = isSaldo ? (saldoPositive ? 'border-success/20' : 'border-destructive/20') : card.border;

        return (
          <Card key={card.key} className={cn('border', borderClass)}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bgClass)}>
                  <card.icon size={16} className={colorClass} />
                </div>
                <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
              </div>
              <p className={cn('text-xl font-bold', colorClass)}>{formatCurrency(value)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
