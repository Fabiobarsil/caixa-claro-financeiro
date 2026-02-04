import { ExternalLink, Check, Sparkles, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlanOption {
  id: string;
  name: string;
  price: string;
  priceMonthly: string;
  duration: string;
  checkoutUrl: string;
  popular?: boolean;
  savings?: string;
}

const plans: PlanOption[] = [
  {
    id: 'mensal',
    name: 'Plano Mensal',
    price: 'R$ 29,90',
    priceMonthly: 'R$ 29,90/mês',
    duration: 'por mês',
    checkoutUrl: import.meta.env.VITE_KIWIFY_CHECKOUT_MENSAL || '#',
  },
  {
    id: 'semestral',
    name: 'Plano Semestral',
    price: 'R$ 149,40',
    priceMonthly: 'R$ 24,90/mês',
    duration: '6 meses',
    checkoutUrl: import.meta.env.VITE_KIWIFY_CHECKOUT_SEMESTRAL || '#',
    popular: true,
    savings: 'Economia de R$ 30',
  },
  {
    id: 'anual',
    name: 'Plano Anual',
    price: 'R$ 238,80',
    priceMonthly: 'R$ 19,90/mês',
    duration: '12 meses',
    checkoutUrl: import.meta.env.VITE_KIWIFY_CHECKOUT_ANUAL || '#',
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
  
  const handleSelectPlan = (plan: PlanOption) => {
    if (plan.checkoutUrl && plan.checkoutUrl !== '#') {
      window.open(plan.checkoutUrl, '_blank', 'noopener,noreferrer');
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
            Continue usando o CaixaCertus
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Escolha o plano ideal para você e mantenha seu controle financeiro em dia.
          </DialogDescription>
        </DialogHeader>

        {/* Benefits */}
        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            O que está incluso:
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
            <Card 
              key={plan.id}
              className={cn(
                "relative transition-all hover:shadow-md cursor-pointer",
                plan.popular && "border-primary shadow-sm"
              )}
              onClick={() => handleSelectPlan(plan)}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                  Mais Popular
                </Badge>
              )}
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-center text-base">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <div>
                  <span className="text-2xl font-bold text-primary">
                    {plan.priceMonthly.split('/')[0]}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                
                {plan.savings && (
                  <Badge variant="secondary" className="text-xs">
                    {plan.savings}
                  </Badge>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {plan.duration !== 'por mês' ? `Cobrado ${plan.price} a cada ${plan.duration}` : 'Cobrado mensalmente'}
                </p>
                
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  size="sm"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Assinar agora
                </Button>
              </CardContent>
            </Card>
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
