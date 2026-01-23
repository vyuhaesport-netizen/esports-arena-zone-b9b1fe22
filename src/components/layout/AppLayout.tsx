import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  hideBottomNav?: boolean;
}

const AppLayout = ({ children, title, showBack = false, hideBottomNav = false }: AppLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gaming-cyan/5 rounded-full blur-3xl" />
      </div>
      
      {(title || showBack) && (
        <header className="sticky top-0 z-40 glass-card px-4 py-3 border-b border-border/50 flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {title && (
            <h1 className={`text-lg font-semibold ${showBack ? '' : 'text-center w-full'}`}>{title}</h1>
          )}
        </header>
      )}
      <main className={`flex-1 ${hideBottomNav ? '' : 'pb-20'} overflow-y-auto relative z-10`}>
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
