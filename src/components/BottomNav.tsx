import { NavLink, useLocation } from 'react-router-dom';
import { Home, Receipt, Users, TrendingDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Início' },
  { to: '/lancamentos', icon: Receipt, label: 'Lançamentos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/despesas', icon: TrendingDown, label: 'Despesas' },
  { to: '/configuracoes', icon: Settings, label: 'Config' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
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
