import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmallMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
}

export default function SmallMetricCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  iconColor,
  onClick
}: SmallMetricCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component 
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl p-4 border border-border shadow-card transition-all card-interactive w-full text-left",
        onClick && "cursor-pointer hover:border-primary/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg bg-secondary flex items-center justify-center",
          iconColor || "text-muted-foreground"
        )}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </Component>
  );
}
