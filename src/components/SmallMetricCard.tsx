import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmallMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export default function SmallMetricCard({ title, value, icon: Icon }: SmallMetricCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-card transition-all card-interactive">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
