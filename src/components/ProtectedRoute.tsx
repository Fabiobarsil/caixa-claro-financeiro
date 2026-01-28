import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { TermsAcceptanceModal } from '@/components/TermsAcceptanceModal';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isLoading, isAuthReady, user, accountId } = useAuth();
  const { hasAccepted, isLoading: isTermsLoading } = useTermsAcceptance();

  // Wait for auth to be fully ready before making any decisions
  if (!isAuthReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // MULTI-TENANT SAFETY CHECK: Block access if user has no account_id
  // BUT: Allow admins through - they are the first users and might be setting up
  // The account should have been created by handle_new_user trigger
  // Only block operators who don't have an account assigned yet
  if (!accountId && user && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <ShieldAlert className="h-16 w-16 text-warning mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Aguardando liberação</h1>
        <p className="text-muted-foreground max-w-md">
          Sua conta está sendo configurada pelo administrador. 
          Por favor, aguarde ou entre em contato com o suporte.
        </p>
      </div>
    );
  }

  // Show loading while checking terms acceptance for admins
  if (isAdmin && isTermsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show terms acceptance modal for admins who haven't accepted
  if (isAdmin && !hasAccepted) {
    return (
      <>
        <div className="min-h-screen bg-background" />
        <TermsAcceptanceModal open={true} />
      </>
    );
  }

  return <>{children}</>;
}
