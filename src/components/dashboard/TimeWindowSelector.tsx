import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface MonthPeriod {
  year: number;
  month: number; // 0-indexed (Jan=0)
}

interface MonthSelectorProps {
  value: MonthPeriod;
  onChange: (value: MonthPeriod) => void;
  className?: string;
}

export default function MonthSelector({ value, onChange, className }: MonthSelectorProps) {
  const currentDate = new Date(value.year, value.month, 1);
  const label = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  const goToPrevMonth = () => {
    const prev = new Date(value.year, value.month - 1, 1);
    onChange({ year: prev.getFullYear(), month: prev.getMonth() });
  };

  const goToNextMonth = () => {
    const next = new Date(value.year, value.month + 1, 1);
    onChange({ year: next.getFullYear(), month: next.getMonth() });
  };

  // Don't allow navigating beyond current month
  const now = new Date();
  const isCurrentMonth = value.year === now.getFullYear() && value.month === now.getMonth();

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToPrevMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-semibold capitalize min-w-[160px] text-center">
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToNextMonth}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
