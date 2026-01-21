import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import CertusCardHeader from '@/components/ui/CertusCardHeader';

interface SmallMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  tooltip?: string;
}

export default function SmallMetricCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  iconColor,
  onClick,
  tooltip
}: SmallMetricCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component 
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl p-4 border border-border shadow-sm transition-all duration-150 w-full text-left",
        onClick && "cursor-pointer hover:border-primary/30 hover:shadow-md active:scale-[0.99] active:opacity-95"
      )}
    >
      <CertusCardHeader
        title={title}
        helpText={tooltip}
        icon={
          <div className={cn(
            "w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0",
            iconColor || "text-muted-foreground"
          )}>
            <Icon size={20} />
          </div>
        }
        titleClassName="text-xs"
        className="mb-1"
      />
      <div className="pl-0">
        <p className="text-lg font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Component>
  );
}
