import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Crown, Sparkles, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import PlanSelectionModal from './PlanSelectionModal';

const PLAN_LABELS: Record<string, string> = {
  mensal: 'Mensal',
  semestral: 'Semestral',
  anual: 'Anual',
};

export default function CurrentPlanCard() {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const { 
    subscriptionStatus, 
    planType,
    subscriptionPlan,
    selectedPlan,
    subscriptionExpirationDate,
    trialDaysRemaining,
    paidUntil,
    subscribed,
    isTrial,
    isPending
  } = useSubscription();

  // Get the plan name with fallback logic
  const getCurrentPlanName = (): string => {
    // First try subscription_plan
    if (subscriptionPlan && PLAN_LABELS[subscriptionPlan]) {
      return PLAN_LABELS[subscriptionPlan];
    }
    // Fallback to selected_plan
    if (selectedPlan && PLAN_LABELS[selectedPlan]) {
      return PLAN_LABELS[selectedPlan];
    }
    // Default to Mensal
    return 'Mensal';
  };

  const currentPlanName = getCurrentPlanName();

  // Determine what to display
  const getPlanDisplay = () => {
    if (subscribed && planType === 'owner') {
      return {
        badge: 'OWNER',
        badgeClass: 'bg-amber-500 hover:bg-amber-500',
        title: 'Acesso Permanente',
        subtitle: 'Sem data de expiração',
        icon: Crown,
        iconClass: 'text-amber-500'
      };
    }

    if (subscribed) {
      // Format expiration date if available
      const expirationText = subscriptionExpirationDate 
        ? `Válido até ${format(new Date(subscriptionExpirationDate), "dd/MM/yyyy", { locale: ptBR })}`
        : paidUntil
          ? `Válido até ${format(new Date(paidUntil), "dd/MM/yyyy", { locale: ptBR })}`
          : 'Assinatura ativa';
      
      return {
        badge: 'ATIVO',
        badgeClass: 'bg-emerald-500 hover:bg-emerald-500',
        title: `Plano: ${currentPlanName}`,
        subtitle: expirationText,
        icon: Crown,
        iconClass: 'text-emerald-500'
      };
    }

    if (isTrial) {
      const daysText = trialDaysRemaining === 1 ? '1 dia' : `${trialDaysRemaining} dias`;
      return {
        badge: 'TRIAL',
        badgeClass: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/10',
        title: `Plano: ${currentPlanName}`,
        subtitle: `Teste termina em ${daysText}`,
        icon: Clock,
        iconClass: 'text-blue-500'
      };
    }

    if (isPending) {
      return {
        badge: 'PENDENTE',
        badgeClass: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/10',
        title: `Plano: ${currentPlanName}`,
        subtitle: 'Aguardando confirmação de pagamento',
        icon: AlertCircle,
        iconClass: 'text-orange-500'
      };
    }

    // Expired or other status
    return {
      badge: subscriptionStatus?.toUpperCase() || 'INATIVO',
      badgeClass: 'bg-destructive text-destructive-foreground',
      title: 'Sem assinatura ativa',
      subtitle: 'Escolha um plano para continuar',
      icon: AlertCircle,
      iconClass: 'text-destructive'
    };
  };

  const planDisplay = getPlanDisplay();
  const IconComponent = planDisplay.icon;

  return (
    <>
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center ${planDisplay.iconClass}`}>
            <IconComponent size={20} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Plano Atual</p>
            <p className="text-sm text-muted-foreground">Gerencie sua assinatura</p>
          </div>
          <Badge className={planDisplay.badgeClass}>
            {planDisplay.badge}
          </Badge>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{planDisplay.title}</p>
              <p className="text-sm text-muted-foreground">{planDisplay.subtitle}</p>
            </div>
          </div>

          <Button 
            onClick={() => setShowPlanModal(true)}
            className="w-full"
            variant={subscribed && planType !== 'owner' ? 'outline' : 'default'}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Ver Planos
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
      </div>

      <PlanSelectionModal 
        open={showPlanModal} 
        onOpenChange={setShowPlanModal}
      />
    </>
  );
}
