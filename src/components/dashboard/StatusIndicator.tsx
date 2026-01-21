import { LucideIcon, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatusIndicatorProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  onClick?: () => void;
  tooltip?: string;
}

const variantStyles = {
  success: {
    icon: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  warning: {
    icon: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  danger: {
    icon: 'text-rose-500',
    bg: 'bg-rose-50',
  },
  neutral: {
    icon: 'text-slate-500',
    bg: 'bg-slate-50',
  },
};

export default function StatusIndicator({ 
  label, 
  value, 
  icon: Icon, 
  variant,
  onClick,
  tooltip
}: StatusIndicatorProps) {
  const styles = variantStyles[variant];
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left',
        styles.bg,
        onClick && 'cursor-pointer hover:opacity-80'
      )}
    >
      <Icon size={20} className={styles.icon} />
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        {tooltip && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                <HelpCircle size={12} className="text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </Component>
  );
}
