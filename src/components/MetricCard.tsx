import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'success' | 'warning' | 'expense' | 'profit';
  subtitle?: string;
}

const variantStyles = {
  success: {
    card: 'bg-success-light border border-success/20',
    icon: 'bg-success/15 text-success',
    value: 'text-success',
  },
  warning: {
    card: 'bg-warning-light border border-warning/20',
    icon: 'bg-warning/15 text-warning',
    value: 'text-warning',
  },
  expense: {
    card: 'bg-expense-light border border-expense/20',
    icon: 'bg-expense/15 text-expense',
    value: 'text-expense',
  },
  profit: {
    card: 'bg-profit-light border border-profit/20',
    icon: 'bg-profit/15 text-profit',
    value: 'text-profit',
  },
};

export default function MetricCard({ title, value, icon: Icon, variant, subtitle }: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn('rounded-xl p-4 transition-all card-interactive', styles.card)}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', styles.icon)}>
          <Icon size={18} />
        </div>
      </div>
      <p className={cn('money-display-lg', styles.value)}>
        {formatCurrency(value)}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
