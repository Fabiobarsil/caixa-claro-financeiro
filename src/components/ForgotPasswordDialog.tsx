import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        // Don't reveal if email exists or not - always show success
      }

      // Always show success to prevent email enumeration
      setIsSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Erro ao processar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setIsSent(false);
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Recuperar senha
          </DialogTitle>
          <DialogDescription>
            {isSent
              ? 'Verifique sua caixa de entrada'
              : 'Informe seu e-mail para receber o link de recuperação'}
          </DialogDescription>
        </DialogHeader>

        {isSent ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Se esse e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.
              Verifique também a pasta de spam.
            </p>
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center animate-fade-in">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
