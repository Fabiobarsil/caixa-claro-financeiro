import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';
import iconCaixacertus from '@/assets/icon-caixacertus.svg';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAuthReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Navigate when authentication state is fully ready and user is authenticated
  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isAuthReady, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'E-mail ou senha incorretos');
        setIsLoading(false);
      }
      // Navigation will happen via useEffect when isAuthenticated changes
    } catch (err) {
      setError('Erro ao processar. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3">
            <img 
              src={iconCaixacertus} 
              alt="CaixaCertus" 
              className="h-14 w-auto"
            />
            <span className="text-3xl font-bold">
              <span className="text-foreground">Caixa</span>
              <span style={{ color: '#309050' }}>Certus</span>
            </span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-12 pr-10"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-primary hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center animate-fade-in">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>

          {/* Link para primeiro acesso */}
          <div className="pt-4 border-t mt-6">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Ainda não tem uma conta?
            </p>
            <Link to="/primeiro-acesso">
              <Button variant="outline" className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Criar primeira conta
              </Button>
            </Link>
          </div>
        </form>
      </div>

      <ForgotPasswordDialog
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
}
