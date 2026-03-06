import { Entry } from '@/types';
import { formatCurrency, formatShortDate } from '@/lib/formatters';
import StatusBadge from './StatusBadge';

interface EntryListItemProps {
  entry: Entry;
  onClick?: () => void;
}

export default function EntryListItem({ entry, onClick }: EntryListItemProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-3 px-4 bg-card rounded-xl border border-border hover:border-primary/25 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-[0.99] active:opacity-90 min-h-[52px]"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{entry.clientName}</p>
        <p className="text-sm text-muted-foreground truncate">{entry.itemName}</p>
      </div>
      <div className="flex flex-col items-end gap-1 ml-3">
        <p className="font-semibold text-foreground money-display">
          {formatCurrency(entry.value)}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatShortDate(entry.date)}
          </span>
          <StatusBadge status={entry.status} size="sm" />
        </div>
      </div>
    </div>
  );
}
