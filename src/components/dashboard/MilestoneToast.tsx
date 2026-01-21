import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Trophy, Calendar, CheckCircle } from 'lucide-react';

interface MilestoneToastProps {
  totalEntries: number;
  accountCreatedAt?: string;
  hasFirstPayment: boolean;
}

// Local storage keys to track shown milestones
const MILESTONE_KEYS = {
  entries10: 'caixacertus_milestone_entries_10',
  days30: 'caixacertus_milestone_days_30',
  firstPayment: 'caixacertus_milestone_first_payment',
};

export default function MilestoneToast({ 
  totalEntries, 
  accountCreatedAt, 
  hasFirstPayment 
}: MilestoneToastProps) {
  const hasShownRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate toasts in same render cycle
    if (hasShownRef.current) return;

    // Check for 10 entries milestone
    if (totalEntries >= 10 && !localStorage.getItem(MILESTONE_KEYS.entries10)) {
      hasShownRef.current = true;
      localStorage.setItem(MILESTONE_KEYS.entries10, 'true');
      toast.success(
        <div className="flex items-center gap-3">
          <Trophy className="text-warning shrink-0" size={20} />
          <div>
            <p className="font-medium">Marco alcançado!</p>
            <p className="text-sm text-muted-foreground">
              Você já organizou mais de 10 registros financeiros.
            </p>
          </div>
        </div>,
        { duration: 6000 }
      );
      return;
    }

    // Check for 30 days milestone
    if (accountCreatedAt) {
      const createdDate = new Date(accountCreatedAt);
      const daysSinceCreation = Math.floor(
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceCreation >= 30 && !localStorage.getItem(MILESTONE_KEYS.days30)) {
        hasShownRef.current = true;
        localStorage.setItem(MILESTONE_KEYS.days30, 'true');
        toast.success(
          <div className="flex items-center gap-3">
            <Calendar className="text-primary shrink-0" size={20} />
            <div>
              <p className="font-medium">Parabéns pela consistência!</p>
              <p className="text-sm text-muted-foreground">
                Você mantém seu controle financeiro atualizado há 30 dias.
              </p>
            </div>
          </div>,
          { duration: 6000 }
        );
        return;
      }
    }

    // Check for first payment milestone
    if (hasFirstPayment && !localStorage.getItem(MILESTONE_KEYS.firstPayment)) {
      hasShownRef.current = true;
      localStorage.setItem(MILESTONE_KEYS.firstPayment, 'true');
      toast.success(
        <div className="flex items-center gap-3">
          <CheckCircle className="text-success shrink-0" size={20} />
          <div>
            <p className="font-medium">Recebimento registrado!</p>
            <p className="text-sm text-muted-foreground">
              Seu caixa está evoluindo.
            </p>
          </div>
        </div>,
        { duration: 5000 }
      );
    }
  }, [totalEntries, accountCreatedAt, hasFirstPayment]);

  // This component doesn't render anything visible
  return null;
}
