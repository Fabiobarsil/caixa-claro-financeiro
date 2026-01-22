import { useState } from 'react';
import { Clock, Sparkles, ExternalLink, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import UpgradeModal from './UpgradeModal';

export default function SubscriptionBanner() {
  const {
    subscribed,
    planType,
    trialDaysRemaining,
    trialExpired,
    trialDaysUsed,
    openKiwifyCheckout,
    isLoading,
  } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show anything while loading or before day 10
  if (isLoading || trialDaysUsed < 10 || dismissed) {
    return null;
  }

  // User is subscribed - show active plan status
  if (subscribed && planType === 'paid') {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Plano Completo Ativo</p>
              <p className="text-sm text-muted-foreground">
                Você tem acesso ilimitado ao CaixaCertus
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired - show upgrade prompt
  if (trialExpired) {
    return (
      <>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive">
                Período gratuito encerrado
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Para continuar criando novos lançamentos, ative seu plano. 
                Você ainda pode visualizar todo seu histórico.
              </p>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                size="sm"
                className="mt-3"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ativar plano
              </Button>
            </div>
          </div>
        </div>

        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          context="dashboard"
        />
      </>
    );
  }

  // Trial active with few days remaining - show gentle reminder
  if (trialDaysRemaining !== null && trialDaysRemaining <= 4) {
    return (
      <>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">
                  {trialDaysRemaining === 0 
                    ? 'Último dia do período gratuito'
                    : `${trialDaysRemaining} dia${trialDaysRemaining > 1 ? 's' : ''} restante${trialDaysRemaining > 1 ? 's' : ''} de teste`
                  }
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-2 -mt-2"
                  onClick={() => setDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Continue controlando seu caixa sem interrupções. Ative seu plano antes do término do período gratuito.
              </p>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Ver planos
              </Button>
            </div>
          </div>
        </div>

        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          context="dashboard"
        />
      </>
    );
  }

  return null;
}
