import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  tooltip?: string;
  footer?: string;
}

export default function SectionCard({ 
  title, 
  subtitle,
  icon,
  action, 
  children, 
  className,
  noPadding,
  tooltip,
  footer
}: SectionCardProps) {
  return (
    <div className={cn(
      'bg-card rounded-2xl border border-border shadow-sm',
      className
    )}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <div className="flex items-center gap-1.5">
                {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
                {tooltip && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle size={14} className="text-muted-foreground/60 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>{tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={cn(!noPadding && 'p-5')}>
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">{footer}</p>
        </div>
      )}
    </div>
  );
}
