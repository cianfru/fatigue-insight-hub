import { Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Header() {
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
        <div className="flex items-center gap-3">
          <Badge variant="info">Version 2.1.2</Badge>
          <Badge variant="success">EASA ORO.FTL Compliant</Badge>
        </div>
      </div>
    </header>
  );
}
