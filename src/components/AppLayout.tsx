import { ReactNode } from 'react';
import BottomNav from './BottomNav';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppLayoutProps {
  children: ReactNode;
  showFab?: boolean;
}

export default function AppLayout({ children, showFab = true }: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <main className="page-container">
        {children}
      </main>
      
      {showFab && (
        <button
          onClick={() => navigate('/lancamentos/novo')}
          className="fab"
          aria-label="Novo lançamento"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}
      
      <BottomNav />
    </div>
  );
}
