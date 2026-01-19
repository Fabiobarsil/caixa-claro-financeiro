import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Target, 
  Package, 
  FileText, 
  LogOut,
  ChevronRight,
  Shield,
  Users,
  Loader2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  const { user, logout, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [stockEnabled, setStockEnabled] = useState(false);

  // Redirect non-admins to dashboard
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <AppLayout showFab={false}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Don't render if not admin (will redirect)
  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout showFab={false}>
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-xl p-4 border border-border mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User size={28} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <Shield size={12} className="text-primary" />
                <span className="text-xs text-primary font-medium capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-2">
          {/* Meta mensal */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                <Target size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">Meta mensal</p>
                <p className="text-sm text-muted-foreground">R$ 10.000,00</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>

          {/* Equipe */}
          <div 
            onClick={() => navigate('/configuracoes/equipe')}
            className="flex items-center justify-between p-4 bg-card rounded-xl border border-border cursor-pointer hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                <Users size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">Equipe</p>
                <p className="text-sm text-muted-foreground">Gerenciar operadores</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>

          {/* Estoque */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                <Package size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">Controle de estoque</p>
                <p className="text-sm text-muted-foreground">
                  {stockEnabled ? 'Ativado' : 'Desativado'}
                </p>
              </div>
            </div>
            <Switch
              checked={stockEnabled}
              onCheckedChange={setStockEnabled}
            />
          </div>

          {/* Exportar */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border cursor-pointer hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                <FileText size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">Exportar resumo</p>
                <p className="text-sm text-muted-foreground">Baixar relatório do mês</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 mt-8 p-4 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/20 transition-colors"
        >
          <LogOut size={20} />
          Sair da conta
        </button>
      </div>
    </AppLayout>
  );
}
