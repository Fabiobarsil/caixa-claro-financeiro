import { useState, useEffect } from 'react';
import { Clock, AlertCircle, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import PlanSelectionModal from './PlanSelectionModal';

const SNOOZE_KEY = 'subscription_banner_snoozed_until';

export default function SubscriptionBanner() {
  const {
    subscriptionStatus,
    isTrial,
    isPending,
    isActive,
    trialDaysRemaining,
    selectedPlan,
    isLoading,
  } = useSubscriptionContext();
  
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  // Check if banner was snoozed
  useEffect(() => {
    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozedUntil) {
      const snoozedDate = new Date(snoozedUntil);
      if (snoozedDate > new Date()) {
        setSnoozed(true);
      } else {
        localStorage.removeItem(SNOOZE_KEY);
      }
    }
  }, []);

  const handleSnooze = () => {
    // Snooze for 24 hours
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + 24);
    localStorage.setItem(SNOOZE_KEY, snoozedUntil.toISOString());
    setSnoozed(true);
  };

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // User is subscribed and active - show active plan status
  if (isActive && subscriptionStatus === 'ativo') {
    return null; // No banner needed for active subscribers
  }

  // If snoozed and in trial, don't show
  if (snoozed && isTrial) {
    return null;
  }

  // Trial state - show countdown banner
  if (isTrial) {
    const daysText = trialDaysRemaining === 1 ? 'dia' : 'dias';
    const isUrgent = trialDaysRemaining !== null && trialDaysRemaining <= 3;
    
    return (
      <>
        <div className={`border rounded-lg p-4 mb-6 ${
          isUrgent 
            ? 'bg-warning/10 border-warning/30' 
            : 'bg-primary/5 border-primary/20'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
              isUrgent ? 'bg-warning/20' : 'bg-primary/10'
            }`}>
              <Clock className={`h-5 w-5 ${isUrgent ? 'text-warning' : 'text-primary'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-foreground">
                    Teste grátis: {trialDaysRemaining === 0 
                      ? 'último dia!' 
                      : `faltam ${trialDaysRemaining} ${daysText}`
                    }
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aproveite o período de teste para explorar todas as funcionalidades.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 -mt-1 -mr-1"
                  onClick={handleSnooze}
                  title="Lembrar depois"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  onClick={() => setShowPlanModal(true)}
                  size="sm"
                  variant={isUrgent ? 'default' : 'outline'}
                >
                  Escolher plano
                </Button>
                <Button
                  onClick={handleSnooze}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  Depois
                </Button>
              </div>
            </div>
          </div>
        </div>

        <PlanSelectionModal
          open={showPlanModal}
          onOpenChange={setShowPlanModal}
        />
      </>
    );
  }

  // Pending state - trial ended, waiting for payment
  if (isPending) {
    const planName = selectedPlan === 'semestral' ? 'Semestral' 
      : selectedPlan === 'anual' ? 'Anual' 
      : 'Mensal';
    
    return (
      <>
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-warning/20 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">
                Seu teste terminou
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Plano padrão selecionado: <strong>{planName}</strong>. 
                Para continuar com acesso completo, conclua a assinatura.
              </p>
              <Button
                onClick={() => setShowPlanModal(true)}
                size="sm"
                className="mt-3"
              >
                <Crown className="h-4 w-4 mr-2" />
                Assinar plano
              </Button>
            </div>
          </div>
        </div>

        <PlanSelectionModal
          open={showPlanModal}
          onOpenChange={setShowPlanModal}
        />
      </>
    );
  }

  return null;
}
