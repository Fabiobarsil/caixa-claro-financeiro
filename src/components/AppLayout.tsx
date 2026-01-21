import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import BottomNav from './BottomNav';
import AppSidebar from './AppSidebar';
import GlobalHeader from './GlobalHeader';

interface AppLayoutProps {
  children: ReactNode;
  showFab?: boolean;
  showHeader?: boolean;
}

export default function AppLayout({ 
  children, 
  showFab = true,
  showHeader = true 
}: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <AppSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Global Header */}
        {showHeader && <GlobalHeader />}
        
        {/* Page Content */}
        <main className="flex-1 page-container lg:pb-6">
          <div className="max-w-4xl mx-auto px-4 py-4 lg:py-6">
            {children}
          </div>
        </main>
        
        {/* Mobile FAB */}
        {showFab && (
          <button
            onClick={() => navigate('/lancamentos/novo')}
            className="fab lg:hidden"
            aria-label="Novo lançamento"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        )}
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
