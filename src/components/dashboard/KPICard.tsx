import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'success' | 'info' | 'expense' | 'neutral';
  onClick?: () => void;
}

const variantStyles = {
  success: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
    border: 'border-emerald-200/60',
    icon: 'bg-emerald-500 text-white',
    value: 'text-emerald-600',
  },
  info: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
    border: 'border-blue-200/60',
    icon: 'bg-blue-500 text-white',
    value: 'text-blue-600',
  },
  expense: {
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50',
    border: 'border-rose-200/60',
    icon: 'bg-rose-500 text-white',
    value: 'text-rose-600',
  },
  neutral: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
    border: 'border-slate-200/60',
    icon: 'bg-slate-600 text-white',
    value: 'text-slate-700',
  },
};

export default function KPICard({ title, value, icon: Icon, variant, onClick }: KPICardProps) {
  const styles = variantStyles[variant];
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'rounded-2xl p-5 border transition-all duration-200 w-full text-left',
        'shadow-sm hover:shadow-md',
        styles.bg,
        styles.border,
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm', styles.icon)}>
          <Icon size={20} />
        </div>
      </div>
      <p className={cn('text-2xl font-bold tracking-tight', styles.value)}>
        {formatCurrency(value)}
      </p>
    </Component>
  );
}
