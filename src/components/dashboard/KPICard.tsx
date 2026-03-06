import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import CertusCardHeader from '@/components/ui/CertusCardHeader';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'success' | 'info' | 'expense' | 'neutral';
  onClick?: () => void;
  tooltip?: string;
  subtitle?: string;
}

const variantStyles = {
  success: {
    bg: 'bg-success-light',
    border: 'border-success/15',
    icon: 'bg-success text-success-foreground',
    value: 'text-success',
  },
  info: {
    bg: 'bg-profit-light',
    border: 'border-profit/15',
    icon: 'bg-profit text-profit-foreground',
    value: 'text-profit',
  },
  expense: {
    bg: 'bg-expense-light',
    border: 'border-expense/15',
    icon: 'bg-expense text-expense-foreground',
    value: 'text-expense',
  },
  neutral: {
    bg: 'bg-secondary',
    border: 'border-border',
    icon: 'bg-foreground/80 text-background',
    value: 'text-foreground',
  },
};

export default function KPICard({ title, value, icon: Icon, variant, onClick, tooltip, subtitle }: KPICardProps) {
  const styles = variantStyles[variant];
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'rounded-xl p-5 border transition-all duration-150 w-full text-left group',
        'shadow-card hover:shadow-md',
        'hover:border-primary/25 hover:-translate-y-0.5',
        'active:scale-[0.99] active:opacity-95',
        styles.bg,
        styles.border,
        onClick && 'cursor-pointer'
      )}
    >
      <CertusCardHeader
        title={title}
        helpText={tooltip}
        icon={
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', styles.icon)}>
            <Icon size={18} />
          </div>
        }
        className="mb-3"
        titleClassName="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      />
      <p className={cn('text-[28px] font-bold tracking-tight leading-none', styles.value)}>
        {formatCurrency(value)}
      </p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-2">{subtitle}</p>
      )}
    </Component>
  );
}
