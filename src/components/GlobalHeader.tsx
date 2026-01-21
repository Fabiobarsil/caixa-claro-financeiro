import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Home, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  const { user, logout } = useAuth();
  const now = useCurrentTime();

  const greeting = getGreeting();
  const dayOfWeek = format(now, "EEEE", { locale: ptBR });
  const fullDate = format(now, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const currentTime = format(now, "HH:mm");

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={cn(
      "flex items-center justify-between py-4 px-4 lg:px-6 bg-card border-b border-border",
      className
    )}>
      <div className="flex items-center gap-4">
        {/* Dashboard shortcut - mobile only */}
        <button
          onClick={() => navigate('/dashboard')}
          className="lg:hidden w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
          aria-label="Dashboard"
        >
          <Home size={20} />
        </button>
        
        {/* Greeting and date/time */}
        <div>
          <h1 className="text-lg lg:text-xl font-semibold text-foreground">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {dayOfWeek}, {fullDate} — {currentTime}
          </p>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        aria-label="Sair"
      >
        <LogOut size={20} />
      </button>
    </header>
  );
}
