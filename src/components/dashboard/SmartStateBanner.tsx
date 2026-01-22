import { AlertTriangle, Lightbulb, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SmartState } from '@/hooks/useSmartState';

interface SmartStateBannerProps {
  smartState: SmartState | null;
}

export default function SmartStateBanner({ smartState }: SmartStateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Silence rule: if no smart_state or dismissed, render nothing
  if (!smartState || dismissed) {
    return null;
  }

  const isAlert = smartState.type === 'alert';
  const isAttention = smartState.severity === 'attention';

  return (
    <div
      className={cn(
        'mb-4 px-4 py-3 rounded-lg border flex items-center gap-3',
        isAttention
          ? 'bg-expense/10 border-expense/30 text-expense'
          : 'bg-primary/5 border-primary/20 text-foreground'
      )}
      role="alert"
    >
      {/* Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isAttention ? 'bg-expense/20' : 'bg-primary/10'
        )}
      >
        {isAlert ? (
          <AlertTriangle size={16} className={isAttention ? 'text-expense' : 'text-primary'} />
        ) : (
          <Lightbulb size={16} className="text-primary" />
        )}
      </div>

      {/* Message */}
      <p className="flex-1 text-sm leading-relaxed">
        {smartState.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className={cn(
          'p-1 rounded hover:bg-black/5 transition-colors shrink-0',
          isAttention ? 'text-expense/70 hover:text-expense' : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Dispensar"
      >
        <X size={16} />
      </button>
    </div>
  );
}
