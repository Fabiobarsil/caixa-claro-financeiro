import { getEntryVisualInfo, VisualStatus } from '@/lib/entryStatus';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertTriangle } from 'lucide-react';

interface EntryStatusBadgeProps {
  status: 'pago' | 'pendente';
  dueDate: string | null;
  paymentDate: string | null;
  size?: 'sm' | 'md';
}

const icons: Record<VisualStatus, typeof Check> = {
  pago: Check,
  a_vencer: Clock,
  vence_hoje: Clock,
  vencido: AlertTriangle,
};

export default function EntryStatusBadge({ 
  status, 
  dueDate, 
  paymentDate,
  size = 'md' 
}: EntryStatusBadgeProps) {
  const { visualStatus, label, variant } = getEntryVisualInfo(status, dueDate, paymentDate);
  const Icon = icons[visualStatus];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        variant === 'success' && 'bg-success/10 text-success',
        variant === 'warning' && 'bg-warning/10 text-warning',
        variant === 'destructive' && 'bg-destructive/10 text-destructive'
      )}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      {label}
    </span>
  );
}
