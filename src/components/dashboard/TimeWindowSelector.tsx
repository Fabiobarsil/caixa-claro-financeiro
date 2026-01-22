import { cn } from '@/lib/utils';
import type { TimeWindow } from '@/hooks/useBIData';

interface TimeWindowSelectorProps {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
  className?: string;
}

const windows: TimeWindow[] = [30, 60, 90];

export default function TimeWindowSelector({ value, onChange, className }: TimeWindowSelectorProps) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {windows.map((window) => (
        <button
          key={window}
          onClick={() => onChange(window)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
            value === window
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          )}
        >
          {window} dias
        </button>
      ))}
    </div>
  );
}
