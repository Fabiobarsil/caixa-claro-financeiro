import { ExternalLink, Check, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: 'dashboard' | 'create-blocked';
}

export default function UpgradeModal({ open, onOpenChange, context = 'dashboard' }: UpgradeModalProps) {
  const { openKiwifyCheckout, trialDaysUsed } = useSubscription();

  const handleUpgrade = () => {
    openKiwifyCheckout();
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
                Seu período gratuito de {trialDaysUsed} dias terminou.
                <br />
                Para continuar criando lançamentos, ative seu plano.
              </>
            ) : (
              <>
                Você já criou o hábito de controlar seu caixa.
                <br />
                Ative o plano completo para uso contínuo e ilimitado.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Features */}
        <div className="space-y-2 py-4 text-sm text-muted-foreground">
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
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Suporte prioritário</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button
            onClick={handleUpgrade}
            className="w-full"
            size="lg"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Assinar na Kiwify
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Agora não
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Você será redirecionado para o checkout seguro da Kiwify
        </p>
      </DialogContent>
    </Dialog>
  );
}
