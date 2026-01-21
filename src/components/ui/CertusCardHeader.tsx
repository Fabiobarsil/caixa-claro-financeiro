import { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface CertusCardHeaderProps {
  title: string;
  helpText?: string;
  icon?: ReactNode;
  badgeRight?: ReactNode;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
}

export default function CertusCardHeader({
  title,
  helpText,
  icon,
  badgeRight,
  subtitle,
  className,
  titleClassName,
}: CertusCardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      {/* Left zone: Title + Tooltip */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span 
            className={cn(
              'text-sm font-medium text-muted-foreground leading-tight',
              titleClassName
            )}
          >
            {title}
          </span>
          {helpText && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex-shrink-0 p-1 -m-1 rounded-full hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label={`Ajuda sobre ${title}`}
                  >
                    <HelpCircle 
                      size={14} 
                      className="text-muted-foreground/50" 
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  className="max-w-[280px] text-sm leading-relaxed"
                >
                  <p>{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right zone: Icon and/or Badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {badgeRight}
        {icon}
      </div>
    </div>
  );
}
