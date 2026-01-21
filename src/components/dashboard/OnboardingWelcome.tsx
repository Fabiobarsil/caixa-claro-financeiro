import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Package, Users, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isOnboardingDismissed, dismissOnboarding } from '@/hooks/useOnboardingProgress';

interface OnboardingWelcomeProps {
  isAdmin: boolean;
}

const steps = [
  {
    icon: Package,
    title: 'Cadastre seus serviços ou produtos',
    description: 'Defina o que você oferece para agilizar os lançamentos.',
    route: '/servicos-produtos',
  },
  {
    icon: Users,
    title: 'Adicione seus clientes',
    description: 'Organize seus atendimentos e histórico por cliente.',
    route: '/clientes',
  },
  {
    icon: FileText,
    title: 'Registre lançamentos',
    description: 'Acompanhe seu fluxo de caixa e visualize relatórios.',
    route: '/novo-lancamento',
  },
];

export default function OnboardingWelcome({ isAdmin }: OnboardingWelcomeProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only show for admins who haven't dismissed
    if (isAdmin && !isOnboardingDismissed()) {
      // Small delay for smoother UX after login
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isAdmin]);

  const handleDismiss = () => {
    dismissOnboarding();
    setOpen(false);
  };

  const handleStartStep = (route: string) => {
    dismissOnboarding();
    setOpen(false);
    navigate(route);
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) handleDismiss();
      else setOpen(value);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Bem-vindo ao CaixaCertus</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Organize seu caixa em poucos passos.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {steps.map((step, index) => (
            <button
              key={step.title}
              onClick={() => handleStartStep(step.route)}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Começar depois
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
