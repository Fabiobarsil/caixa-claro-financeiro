import { Entry } from '@/types';
import { formatCurrency, getDaysAgo } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';

interface PendingListItemProps {
  entry: Entry;
  onClick?: () => void;
}

export default function PendingListItem({ entry, onClick }: PendingListItemProps) {
  const daysAgo = getDaysAgo(entry.date);

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 bg-warning-light rounded-lg border border-warning/20 hover:border-warning/40 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-warning">
          <AlertCircle size={16} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{entry.clientName}</p>
          <p className="text-sm text-muted-foreground truncate">{entry.itemName}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 ml-3">
        <p className="font-semibold text-warning money-display">
          {formatCurrency(entry.value)}
        </p>
        {daysAgo > 0 && (
          <span className="text-xs text-warning font-medium">
            {daysAgo} {daysAgo === 1 ? 'dia' : 'dias'} atrás
          </span>
        )}
      </div>
    </div>
  );
}
