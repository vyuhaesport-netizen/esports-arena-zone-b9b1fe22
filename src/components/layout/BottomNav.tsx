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
      <div className="max-w-lg mx-auto px-3 pb-2">
        {/* Floating Cyber Nav Container */}
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(210 30% 8% / 0.95) 0%, hsl(210 30% 6% / 0.98) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            border: '1px solid hsl(187 100% 50% / 0.15)',
            boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4), 0 0 0 1px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(187 100% 50% / 0.05)'
          }}
        >
          {/* Top glow line */}
          <div 
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(187 100% 50% / 0.4), transparent)'
            }}
          />
          
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 group"
                >
                  {/* Active indicator beam */}
                  {active && (
                    <>
                      {/* Top glow dot */}
                      <span 
                        className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full animate-neon-pulse"
                        style={{
                          background: 'linear-gradient(90deg, transparent, hsl(187 100% 50%), transparent)',
                          boxShadow: '0 0 10px hsl(187 100% 50% / 0.6), 0 0 20px hsl(187 100% 50% / 0.4)'
                        }}
                      />
                      {/* Icon glow background */}
                      <span 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl opacity-20"
                        style={{
                          background: 'radial-gradient(circle, hsl(187 100% 50%), transparent 70%)'
                        }}
                      />
                    </>
                  )}
                  
                  {/* Icon */}
                  <item.icon 
                    className={`h-5 w-5 transition-all duration-300 ${
                      active 
                        ? 'text-[hsl(187_100%_50%)] drop-shadow-[0_0_8px_hsl(187_100%_50%_/_0.6)]' 
                        : 'text-[hsl(210_15%_50%)] group-hover:text-[hsl(210_15%_70%)]'
                    }`}
                    style={{
                      filter: active ? 'drop-shadow(0 0 6px hsl(187 100% 50% / 0.5))' : 'none'
                    }}
                  />
                  
                  {/* Label */}
                  <span 
                    className={`text-[9px] mt-1 font-medium tracking-wide uppercase transition-all duration-300 ${
                      active 
                        ? 'text-[hsl(187_100%_50%)]' 
                        : 'text-[hsl(210_15%_45%)] group-hover:text-[hsl(210_15%_65%)]'
                    }`}
                    style={{
                      textShadow: active ? '0 0 8px hsl(187 100% 50% / 0.5)' : 'none'
                    }}
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
