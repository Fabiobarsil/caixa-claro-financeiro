import { useState } from 'react';
import { ExternalLink, Check, Sparkles, Crown, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PlanOption {
  id: 'mensal' | 'semestral' | 'anual';
  name: string;
  priceMonthly: string;
  priceTotal: string;
  billingText: string;
  checkoutUrl: string;
  popular?: boolean;
  savings?: string;
}

const plans: PlanOption[] = [
  {
    id: 'mensal',
    name: 'Plano Mensal',
    priceMonthly: 'R$ 29,90',
    priceTotal: 'R$ 29,90',
    billingText: 'Cobrado mensalmente',
    checkoutUrl: import.meta.env.VITE_KIWIFY_CHECKOUT_MENSAL || '',
  },
  {
    id: 'semestral',
    name: 'Plano Semestral',
    priceMonthly: 'R$ 24,90',
    priceTotal: 'R$ 149,40',
    billingText: 'Cobrado a cada 6 meses',
    checkoutUrl: import.meta.env.VITE_KIWIFY_CHECKOUT_SEMESTRAL || '',
    popular: true,
    savings: 'Economia de R$ 30',
  },
  {
    id: 'anual',
    name: 'Plano Anual',
    priceMonthly: 'R$ 19,90',
    priceTotal: 'R$ 238,80',
    billingText: 'Cobrado a cada 12 meses',
    checkoutUrl: import.meta.env.VITE_KIWIFY_CHECKOUT_ANUAL || '',
    savings: 'Economia de R$ 120',
  },
];

const benefits = [
  'Registros ilimitados de lançamentos',
  'Controle completo de clientes',
  'Relatórios e insights automáticos',
  'Dashboard com métricas em tempo real',
  'Suporte prioritário',
];

interface PlanSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocking?: boolean;
}

export default function PlanSelectionModal({ 
  open, 
  onOpenChange,
  blocking = false 
}: PlanSelectionModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSelectPlan = async (plan: PlanOption) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsLoading(plan.id);

    try {
      // Save selected_plan to profiles
      const { error } = await supabase
        .from('profiles')
        .update({ selected_plan: plan.id })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving selected plan:', error);
        toast.error('Erro ao salvar preferência de plano');
        setIsLoading(null);
        return;
      }

      // Redirect to Kiwify checkout
      if (plan.checkoutUrl) {
        window.open(plan.checkoutUrl, '_blank', 'noopener,noreferrer');
        toast.success('Redirecionando para o checkout...');
      } else {
        toast.error('URL de checkout não configurada. Entre em contato com o suporte.');
      }
    } catch (err) {
      console.error('Error selecting plan:', err);
      toast.error('Erro ao processar seleção');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={blocking ? undefined : onOpenChange}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={blocking ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={blocking ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-primary" />
            Escolha seu plano ideal
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Selecione o plano que melhor se adapta às suas necessidades.
          </DialogDescription>
        </DialogHeader>

        {/* Benefits */}
        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Todos os planos incluem:
          </h4>
          <div className="grid gap-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={cn(
                "relative rounded-xl border-2 p-4 transition-all hover:shadow-lg cursor-pointer",
                plan.popular 
                  ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => !isLoading && handleSelectPlan(plan)}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Mais Popular
                </Badge>
              )}
              
              <div className="text-center pt-2">
                <h3 className="font-semibold text-foreground mb-2">{plan.name}</h3>
                
                <div className="mb-2">
                  <span className="text-3xl font-bold text-primary">
                    {plan.priceMonthly.replace('R$ ', '')}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                
                {plan.savings && (
                  <Badge variant="secondary" className="mb-2 text-xs bg-primary/10 text-primary">
                    {plan.savings}
                  </Badge>
                )}
                
                <p className="text-xs text-muted-foreground mb-4">
                  {plan.billingText}
                  {plan.id !== 'mensal' && (
                    <span className="block font-medium text-foreground mt-1">
                      Total: {plan.priceTotal}
                    </span>
                  )}
                </p>
                
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  size="sm"
                  disabled={!!isLoading}
                  loading={isLoading === plan.id}
                  loadingText="Processando..."
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Escolher {plan.name.replace('Plano ', '')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {!blocking && (
          <div className="flex justify-center pt-4">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              Agora não
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Você será redirecionado para o checkout seguro da Kiwify
        </p>
      </DialogContent>
    </Dialog>
  );
}
