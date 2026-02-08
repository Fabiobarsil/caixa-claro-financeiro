import { cn } from '@/lib/utils';
import type { TimeWindow } from '@/hooks/useFinancialSnapshot';

interface TimeWindowSelectorProps {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
  className?: string;
}

// Janelas: 15, 30, 90 dias (default: 30)
const windows: { value: TimeWindow; label: string }[] = [
  { value: 15, label: '15d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

export default function TimeWindowSelector({ value, onChange, className }: TimeWindowSelectorProps) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {windows.map((window) => (
        <button
          key={window.value}
          onClick={() => onChange(window.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
            value === window.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          )}
        >
          {window.label}
        </button>
      ))}
    </div>
  );
}
