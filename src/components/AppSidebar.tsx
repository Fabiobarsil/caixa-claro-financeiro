import { NavLink, useLocation } from 'react-router-dom';
import { Home, Receipt, Users, TrendingDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import logoCaixacertus from '@/assets/logo-caixacertus.svg';

interface NavItem {
  to: string;
  icon: typeof Home;
  label: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/lancamentos', icon: Receipt, label: 'Lançamentos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/despesas', icon: TrendingDown, label: 'Despesas' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', adminOnly: true },
];

export default function AppSidebar() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Filter items based on user role
  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <img 
          src={logoCaixacertus} 
          alt="CaixaCertus" 
          className="h-8 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
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
                    isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60 text-center">
          © 2026 CaixaCertus
        </p>
      </div>
    </aside>
  );
}
