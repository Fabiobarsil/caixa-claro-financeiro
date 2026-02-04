import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Crown, Sparkles, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import PlanSelectionModal from './PlanSelectionModal';

export default function CurrentPlanCard() {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const { 
    subscriptionStatus, 
    planType,
    trialDaysRemaining,
    paidUntil,
    subscribed,
    isTrial,
    isPending
  } = useSubscription();

  // Determine what to display
  const getPlanDisplay = () => {
    if (subscribed && planType === 'owner') {
      return {
        badge: 'OWNER',
        badgeVariant: 'default' as const,
        badgeClass: 'bg-amber-500 hover:bg-amber-500',
        title: 'Acesso Permanente',
        subtitle: 'Sem data de expiração',
        icon: Crown,
        iconClass: 'text-amber-500'
      };
    }

    if (subscribed) {
      // Get plan name from subscription
      const planName = planType === 'paid' ? 'Ativo' : 'Ativo';
      const expirationText = paidUntil 
        ? `Válido até ${format(new Date(paidUntil), "dd/MM/yyyy", { locale: ptBR })}`
        : 'Assinatura ativa';
      
      return {
        badge: 'ATIVO',
        badgeVariant: 'default' as const,
        badgeClass: 'bg-emerald-500 hover:bg-emerald-500',
        title: planName,
        subtitle: expirationText,
        icon: Crown,
        iconClass: 'text-emerald-500'
      };
    }

    if (isTrial) {
      const daysText = trialDaysRemaining === 1 ? '1 dia' : `${trialDaysRemaining} dias`;
      return {
        badge: 'TRIAL',
        badgeVariant: 'secondary' as const,
        badgeClass: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/10',
        title: 'Período de Teste',
        subtitle: `Termina em ${daysText}`,
        icon: Clock,
        iconClass: 'text-blue-500'
      };
    }

    if (isPending) {
      return {
        badge: 'PENDENTE',
        badgeVariant: 'secondary' as const,
        badgeClass: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/10',
        title: 'Aguardando Pagamento',
        subtitle: 'Plano padrão: Mensal',
        icon: AlertCircle,
        iconClass: 'text-orange-500'
      };
    }

    // Expired or other status
    return {
      badge: subscriptionStatus?.toUpperCase() || 'INATIVO',
      badgeVariant: 'destructive' as const,
      badgeClass: '',
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
            {subscribed ? 'Ver Planos' : 'Fazer Upgrade'}
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
