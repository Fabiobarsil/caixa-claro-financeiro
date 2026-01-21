import { useNavigate } from 'react-router-dom';
import { Sparkles, UserPlus, FilePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface OnboardingBannerProps {
  hasEntries: boolean;
}

export default function OnboardingBanner({ hasEntries }: OnboardingBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if user has entries or dismissed
  if (hasEntries || dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-4 mb-6">
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            Vamos organizar seu caixa em poucos minutos.
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Comece cadastrando seu primeiro cliente ou lançamento.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/clientes')}
              className="gap-1.5"
            >
              <UserPlus size={16} />
              Cadastrar Cliente
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/novo-lancamento')}
              className="gap-1.5"
            >
              <FilePlus size={16} />
              Novo Lançamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
