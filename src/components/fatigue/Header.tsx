import { Moon, Sun, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';

interface HeaderProps {
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function Header({ theme, onThemeChange, onMenuToggle, showMenuButton }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuToggle}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <img 
            src={theme === 'dark' ? logoDark : logoLight} 
            alt="Aerowake Logo" 
            className="h-8 w-auto object-contain md:h-10"
          />
          <div className="hidden sm:block">
            <p className="text-[10px] text-muted-foreground md:text-xs">
              Biomathematical fatigue prediction
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hide badges on mobile */}
          <Badge variant="info" className="hidden md:inline-flex">Version 2.1.2</Badge>
          <Badge variant="success" className="hidden lg:inline-flex">EASA ORO.FTL Compliant</Badge>
          
          {/* Apple-style theme toggle */}
          <button
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="relative h-7 w-12 rounded-full bg-secondary/80 p-1 transition-all duration-300 hover:bg-secondary md:h-8 md:w-14"
            aria-label="Toggle theme"
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm shadow-sm transition-all duration-300 md:h-6 md:w-6 ${
                theme === 'dark' ? 'translate-x-0' : 'translate-x-5 md:translate-x-6'
              }`}
            >
              {theme === 'dark' ? (
                <Moon className="h-3 w-3 text-primary md:h-3.5 md:w-3.5" />
              ) : (
                <Sun className="h-3 w-3 text-warning md:h-3.5 md:w-3.5" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
