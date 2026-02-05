import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, Gamepad2, Wallet, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/home', label: 'Home', icon: Home },
    { path: '/creator-tournaments', label: 'Creator', icon: Trophy },
    { path: '/my-match', label: 'My Match', icon: Gamepad2 },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="mx-2 mb-2 rounded-xl glass-card border-2 border-white/30 shadow-xl">
          <div className="flex items-center justify-around h-14">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary shadow-glow-primary" />
                  )}
                  <item.icon 
                    className={`h-4 w-4 transition-all duration-300 ${
                      active ? 'stroke-[2.5px] scale-110' : ''
                    }`} 
                  />
                  <span 
                    className={`text-[9px] mt-0.5 transition-all duration-300 ${
                      active ? 'font-semibold' : ''
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;