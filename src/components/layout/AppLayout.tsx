import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

const AppLayout = ({ children, title }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative">
      {title && (
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
          <h1 className="text-lg font-bold text-center">{title}</h1>
        </header>
      )}
      <main className="flex-1 pb-20 overflow-y-auto px-1">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
