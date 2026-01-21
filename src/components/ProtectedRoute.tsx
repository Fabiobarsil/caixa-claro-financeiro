import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { TermsAcceptanceModal } from '@/components/TermsAcceptanceModal';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isLoading, isAuthReady } = useAuth();
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
