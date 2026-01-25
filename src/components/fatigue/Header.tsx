import { Plane, Moon, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

export function Header({ theme, onThemeChange }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-primary">EASA</span> Fatigue Analysis Tool
            </h1>
            <p className="text-xs text-muted-foreground">
              Biomathematical fatigue prediction based on Borbély two-process model
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="info">Version 2.1.2</Badge>
          <Badge variant="success">EASA ORO.FTL Compliant</Badge>
          
          {/* Apple-style theme toggle */}
          <button
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="relative h-8 w-14 rounded-full bg-secondary/80 p-1 transition-all duration-300 hover:bg-secondary"
            aria-label="Toggle theme"
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm shadow-sm transition-all duration-300 ${
                theme === 'dark' ? 'translate-x-0' : 'translate-x-6'
              }`}
            >
              {theme === 'dark' ? (
                <Moon className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-warning" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
