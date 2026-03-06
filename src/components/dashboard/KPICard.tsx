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
    border: 'border-success/20',
    hoverBorder: 'hover:border-success/40',
    icon: 'bg-success/15 text-success',
    value: 'text-success',
  },
  info: {
    bg: 'bg-profit-light',
    border: 'border-profit/20',
    hoverBorder: 'hover:border-profit/40',
    icon: 'bg-profit/15 text-profit',
    value: 'text-profit',
  },
  expense: {
    bg: 'bg-expense-light',
    border: 'border-expense/20',
    hoverBorder: 'hover:border-expense/40',
    icon: 'bg-expense/15 text-expense',
    value: 'text-expense',
  },
  neutral: {
    bg: 'bg-card',
    border: 'border-border',
    hoverBorder: 'hover:border-foreground/25',
    icon: 'bg-foreground/10 text-foreground',
    value: 'text-foreground',
  },
};

export default function KPICard({ title, value, icon: Icon, variant, onClick, tooltip, subtitle }: KPICardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'rounded-xl p-5 border transition-all duration-200 w-full text-left cursor-pointer',
        'shadow-card hover:shadow-lg hover:-translate-y-0.5',
        'active:scale-[0.98] active:shadow-card',
        styles.bg,
        styles.border,
        styles.hoverBorder,
      )}
    >
      {/* Header: title left, icon right */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
          {tooltip && (
            <CertusCardHeader
              title=""
              helpText={tooltip}
              className="inline-flex"
            />
          )}
        </div>
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', styles.icon)}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <p className={cn('text-[28px] font-bold tracking-tight leading-none', styles.value)}>
        {formatCurrency(value)}
      </p>

      {/* Subtitle / period */}
      {subtitle && (
        <p className="text-[11px] text-muted-foreground/70 mt-2 font-medium">{subtitle}</p>
      )}
    </div>
  );
}
