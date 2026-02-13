import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Home, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import iconCaixacertus from '@/assets/icon-caixacertus.svg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  
  return now;
}

interface GlobalHeaderProps {
  className?: string;
}

export default function GlobalHeader({ className }: GlobalHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const now = useCurrentTime();

  const firstName = user?.name?.split(' ')[0] || 'Gestor';
  const greeting = getGreeting();
  const dayOfWeek = format(now, "EEEE", { locale: ptBR });
  const fullDate = format(now, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const currentTime = format(now, "HH:mm");
  const avatarUrl = user?.avatarUrl;

  const isOnDashboard = location.pathname === '/dashboard';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={cn(
      "flex items-center justify-between py-3 px-4 lg:px-6 bg-card border-b border-border",
      className
    )}>
      {/* Left: Logo + Dashboard shortcut */}
      <div className="flex items-center gap-3">
        {/* Logo - visible on mobile and tablet */}
        <div 
          className="flex items-center gap-2 lg:hidden cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <img 
            src={iconCaixacertus} 
            alt="CaixaCertus" 
            className="h-8 w-auto"
          />
          <span className="text-lg font-bold">
            <span className="text-foreground">Caixa</span>
            <span style={{ color: '#309050' }}>Certus</span>
          </span>
        </div>
        
        {/* Dashboard shortcut button - mobile only, when not on dashboard */}
        {!isOnDashboard && (
          <button
            onClick={() => navigate('/dashboard')}
            className="lg:hidden w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
            aria-label="Dashboard"
          >
            <Home size={18} />
          </button>
        )}
        
        {/* Greeting and date/time - desktop */}
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {dayOfWeek}, {fullDate} — {currentTime}
          </p>
        </div>
      </div>

      {/* Right: Tools and User menu */}
      <div className="flex items-center gap-3">
        {/* Mobile: Greeting compact */}
        <div className="lg:hidden text-right">
          <p className="text-sm font-medium text-foreground">
            {greeting}, {firstName}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentTime}
          </p>
        </div>

        {/* User dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Menu do usuário"
            >
              <Avatar className="w-8 h-8">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={user?.name} /> : null}
                <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'G'}
                </AvatarFallback>
              </Avatar>
              <ChevronDown size={16} className="text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut size={16} className="mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
