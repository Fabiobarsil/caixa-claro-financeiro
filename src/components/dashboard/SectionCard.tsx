import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import CertusCardHeader from '@/components/ui/CertusCardHeader';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  headerContent?: ReactNode;
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
  headerContent,
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
      {(title || action || headerContent) && (
        <div className="px-5 py-4 border-b border-border">
          <div className="flex flex-col gap-3">
            <CertusCardHeader
              title={title || ''}
              helpText={tooltip}
              subtitle={subtitle}
              icon={icon}
              badgeRight={action}
              titleClassName="text-base font-semibold text-foreground"
            />
            {headerContent && (
              <div className="flex justify-start">
                {headerContent}
              </div>
            )}
          </div>
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
