import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTermsAcceptance, CURRENT_TERMS_VERSION } from '@/hooks/useTermsAcceptance';

interface TermsAcceptanceModalProps {
  open: boolean;
}

export function TermsAcceptanceModal({ open }: TermsAcceptanceModalProps) {
  const { acceptTerms } = useTermsAcceptance();
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!hasChecked) return;
    
    setIsAccepting(true);
    setError('');

    const result = await acceptTerms();
    
    if (!result.success) {
      setError(result.error || 'Erro ao registrar aceite');
      setIsAccepting(false);
    }
    // On success, the modal will close automatically via the hasAccepted state
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md sm:max-w-lg">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">
              Termos de Uso
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription className="text-left space-y-3 text-sm text-muted-foreground">
            <p>
              Bem-vindo ao <strong className="text-foreground">CaixaCertus</strong>. Para continuar utilizando 
              o sistema, é necessário aceitar nossos Termos de Uso.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border/50">
              <p className="text-xs">
                <strong className="text-foreground">Resumo dos principais pontos:</strong>
              </p>
              <ul className="text-xs space-y-1.5 list-disc list-inside">
                <li>O sistema é licenciado, não vendido</li>
                <li>Você é responsável pela segurança de suas credenciais</li>
                <li>Os dados inseridos são de sua propriedade</li>
                <li>Tratamos seus dados conforme a LGPD</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <FileText size={14} className="text-primary shrink-0" />
              <Link 
                to="/termos" 
                target="_blank"
                className="text-primary hover:underline text-sm font-medium"
              >
                Ler Termos de Uso completos →
              </Link>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox 
              checked={hasChecked}
              onCheckedChange={(checked) => setHasChecked(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Li e aceito os{' '}
              <Link 
                to="/termos" 
                target="_blank" 
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Termos de Uso
              </Link>
              {' '}e a{' '}
              <Link 
                to="/privacidade" 
                target="_blank" 
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center animate-fade-in">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!hasChecked || isAccepting}
            className="w-full sm:w-auto"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              'Aceitar e continuar'
            )}
          </Button>
        </AlertDialogFooter>

        <p className="text-[10px] text-muted-foreground/60 text-center">
          Versão {CURRENT_TERMS_VERSION} • {new Date().toLocaleDateString('pt-BR')}
        </p>
      </AlertDialogContent>
    </AlertDialog>
  );
}
