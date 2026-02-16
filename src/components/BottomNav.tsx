import { NavLink, useLocation } from 'react-router-dom';
import { Home, Wallet, Receipt, Users, TrendingDown, Settings, Package, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  to: string;
  icon: typeof Home;
  label: string;
  adminOnly?: boolean;
  systemAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: Home, label: 'Início' },
  { to: '/pro-labore', icon: Wallet, label: 'Pró-Labore' },
  { to: '/lancamentos', icon: Receipt, label: 'Lançamentos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/servicos-produtos', icon: Package, label: 'Catálogo' },
  { to: '/despesas', icon: TrendingDown, label: 'Despesas' },
  { to: '/assinaturas', icon: CreditCard, label: 'Assinaturas', systemAdminOnly: true },
  { to: '/configuracoes', icon: Settings, label: 'Config', adminOnly: true },
];

export default function BottomNav() {
  const location = useLocation();
  const { isAdmin, isSystemAdmin } = useAuth();

  // Filter items based on user role
  const visibleItems = navItems.filter(item => {
    if (item.systemAdminOnly) return isSystemAdmin;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  return (
    <nav className="bottom-nav z-50 lg:hidden">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'bottom-nav-item min-w-0 flex-1',
                isActive && 'active'
              )}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs mt-1 font-medium truncate">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
