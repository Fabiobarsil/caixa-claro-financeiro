import { PaymentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md';
}

const statusConfig = {
  pago: {
    label: 'Pago',
    dotClass: 'bg-success',
    badgeClass: 'status-paid',
  },
  pendente: {
    label: 'Pendente',
    dotClass: 'bg-warning',
    badgeClass: 'status-pending',
  },
  cancelado: {
    label: 'Cancelado',
    dotClass: 'bg-muted-foreground',
    badgeClass: 'status-cancelled',
  },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.badgeClass,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  );
}
