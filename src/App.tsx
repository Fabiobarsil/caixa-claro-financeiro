import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, isSupabaseConfigured, supabaseConnectionError } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAdminExists } from "@/hooks/useAdminExists";

import Login from "./pages/Login";
import FirstAccess from "./pages/FirstAccess";
import Dashboard from "./pages/Dashboard";
import Entries from "./pages/Entries";
import NewEntry from "./pages/NewEntry";
import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import ServicesProducts from "./pages/ServicesProducts";
import Prolabore from "./pages/Prolabore";
import ServiceProductForm from "./pages/ServiceProductForm";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import LGPD from "./pages/LGPD";
import Welcome from "./pages/Welcome";

// Component to show configuration error
function SupabaseConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-xl font-bold text-destructive mb-2">
          Erro de Configuração
        </h1>
        <p className="text-muted-foreground mb-4">
          O Supabase não está configurado corretamente.
        </p>
        <div className="bg-background rounded p-3 text-left text-sm font-mono">
          <p className="text-destructive">{supabaseConnectionError}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
        </p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isAuthReady, isLoading } = useAuth();
  const { adminExists, isLoading: isAdminCheckLoading } = useAdminExists();

  // Block all route rendering until auth and admin check are ready
  if (!isAuthReady || isLoading || isAdminCheckLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  // Determine root redirect based on admin existence and auth state
  const getRootElement = () => {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }
    // If no admin exists, redirect to first-access for initial setup
    if (!adminExists) {
      return <Navigate to="/primeiro-acesso" replace />;
    }
    // Otherwise show login
    return <Login />;
  };

  // Block first-access if admin already exists
  const getFirstAccessElement = () => {
    if (adminExists) {
      return <Navigate to="/" replace />;
    }
    return <FirstAccess />;
  };

  return (
    <Routes>
      <Route path="/" element={getRootElement()} />
      <Route path="/primeiro-acesso" element={getFirstAccessElement()} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacidade" element={<PrivacyPolicy />} />
      <Route path="/termos" element={<TermsOfUse />} />
      <Route path="/lgpd" element={<LGPD />} />
      <Route
        path="/boas-vindas"
        element={
          <ProtectedRoute>
            <Welcome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pro-labore"
        element={
          <ProtectedRoute>
            <Prolabore />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lancamentos"
        element={
          <ProtectedRoute>
            <Entries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lancamentos/novo"
        element={
          <ProtectedRoute>
            <NewEntry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes/novo"
        element={
          <ProtectedRoute>
            <ClientForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/despesas"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute requireAdmin>
            <Settings />
          </ProtectedRoute>
        }
      />
        <Route
          path="/configuracoes/equipe"
          element={
            <ProtectedRoute requireAdmin>
              <Team />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assinaturas"
          element={
            <ProtectedRoute requireSystemAdmin>
              <AdminSubscriptions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/servicos-produtos"
          element={
            <ProtectedRoute>
              <ServicesProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/servicos-produtos/novo"
        element={
          <ProtectedRoute>
            <ServiceProductForm />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  // Show error if Supabase is not configured
  if (!isSupabaseConfigured) {
    return <SupabaseConfigError />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
