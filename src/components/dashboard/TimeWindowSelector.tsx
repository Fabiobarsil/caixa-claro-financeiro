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
    <div className={cn('flex gap-1 bg-secondary/50 p-1 rounded-lg', className)}>
      {windows.map((window) => (
        <button
          key={window.value}
          onClick={() => onChange(window.value)}
          className={cn(
            'px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200',
            value === window.value
              ? 'bg-primary text-primary-foreground shadow-md scale-105'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          {window.label}
        </button>
      ))}
    </div>
  );
}
