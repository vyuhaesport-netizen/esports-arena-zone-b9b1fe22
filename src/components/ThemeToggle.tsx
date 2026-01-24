import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  variant?: 'icon' | 'full';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (variant === 'full') {
    return (
      <button
        onClick={toggleTheme}
        className={`w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors ${className}`}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          {isDark ? (
            <Moon className="h-4 w-4 text-white" />
          ) : (
            <Sun className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-sm">Theme</p>
          <p className="text-xs text-muted-foreground">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-primary' : 'bg-muted'}`}>
            <div 
              className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} 
            />
          </div>
        </div>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}

export default ThemeToggle;
