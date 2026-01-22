import { useState } from 'react';
import { Clock, Sparkles, ExternalLink } from 'lucide-react';
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
    openCustomerPortal,
    isLoading,
  } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Don't show anything while loading or before day 10
  if (isLoading || trialDaysUsed < 10) {
    return null;
  }

  // User is subscribed - show manage subscription option
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
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsPortalLoading(true);
              await openCustomerPortal();
              setIsPortalLoading(false);
            }}
            disabled={isPortalLoading}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Gerenciar assinatura
          </Button>
        </div>
      </div>
    );
  }

  // Trial expired - show upgrade prompt
  if (trialExpired) {
    return (
      <>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Período gratuito encerrado
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Para continuar registrando movimentações, ative o plano completo.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Ativar plano completo
            </Button>
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
        <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {trialDaysRemaining === 0 
                    ? 'Último dia do período gratuito'
                    : `${trialDaysRemaining} dia${trialDaysRemaining > 1 ? 's' : ''} restante${trialDaysRemaining > 1 ? 's' : ''} no período gratuito`
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Continue com acesso completo após esse período
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowUpgradeModal(true)}>
              Ver planos
            </Button>
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
