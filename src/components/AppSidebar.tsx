import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Receipt, Users, TrendingDown, Settings, ChevronLeft, ChevronRight, Package, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import iconCaixacertus from '@/assets/icon-caixacertus.svg';

interface NavItem {
  to: string;
  icon: typeof Home;
  label: string;
  adminOnly?: boolean;
  systemAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/lancamentos', icon: Receipt, label: 'Lançamentos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/servicos-produtos', icon: Package, label: 'Serviços & Produtos' },
  { to: '/despesas', icon: TrendingDown, label: 'Despesas' },
  { to: '/assinaturas', icon: CreditCard, label: 'Assinaturas', systemAdminOnly: true },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', adminOnly: true },
];

export default function AppSidebar() {
  const location = useLocation();
  const { isAdmin, isSystemAdmin } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter items based on user role
  const visibleItems = navItems.filter(item => {
    if (item.systemAdminOnly) return isSystemAdmin;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  return (
    <aside className={cn(
      "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border",
        isCollapsed ? "justify-center px-2" : "px-6"
      )}>
        <img 
          src={iconCaixacertus} 
          alt="CaixaCertus" 
          className="h-8 w-8"
        />
        {!isCollapsed && (
          <span className="text-lg font-bold ml-2">
            <span className="text-sidebar-foreground">Caixa</span>
            <span style={{ color: '#309050' }}>Certus</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
            
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isCollapsed && 'justify-center px-2',
                    isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <p className="text-xs text-sidebar-foreground/60 text-center">
            CaixaCertus • Controle com previsibilidade
          </p>
          <p className="text-[10px] text-sidebar-foreground/40 text-center leading-relaxed">
            Para quem precisa de clareza, não planilhas.
          </p>
        </div>
      )}
    </aside>
  );
}
