import { useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

// Pricing configuration
const PRICING = {
  monthly: {
    value: 29.90,
    label: 'Mensal',
    description: 'Cobrado mensalmente',
  },
  yearly: {
    value: 299.90,
    monthlyEquivalent: 24.99,
    label: 'Anual',
    description: 'Cobrado anualmente',
    savings: 59, // R$ savings compared to monthly
  },
};

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: 'dashboard' | 'create-blocked';
}

export default function UpgradeModal({ open, onOpenChange, context = 'dashboard' }: UpgradeModalProps) {
  const { createCheckout, trialDaysUsed } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await createCheckout(selectedPlan);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Continue usando o CaixaCertus
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {context === 'create-blocked' ? (
              <>
                Você usou o CaixaCertus com frequência nos últimos {trialDaysUsed} dias.
                <br />
                Para continuar registrando movimentações, ative o plano completo.
              </>
            ) : (
              <>
                Você já criou o hábito de controlar seu caixa.
                <br />
                O plano completo libera registros ilimitados e uso contínuo.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Yearly Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan('yearly')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              selectedPlan === 'yearly'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{PRICING.yearly.label}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    Economize {formatCurrency(PRICING.yearly.savings)}
                  </span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(PRICING.yearly.monthlyEquivalent)}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {PRICING.yearly.description} ({formatCurrency(PRICING.yearly.value)})
                </div>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'yearly'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                }`}
              >
                {selectedPlan === 'yearly' && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              selectedPlan === 'monthly'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{PRICING.monthly.label}</span>
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(PRICING.monthly.value)}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {PRICING.monthly.description}
                </div>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'monthly'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                }`}
              >
                {selectedPlan === 'monthly' && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
            </div>
          </button>
        </div>

        {/* Features */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Registros ilimitados</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Uso contínuo sem interrupções</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Histórico completo sempre disponível</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Carregando...' : 'Ativar plano completo'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
