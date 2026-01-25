import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DutyAnalysis } from '@/types/fatigue';
import { Globe } from 'lucide-react';

interface RouteNetworkProps {
  duties: DutyAnalysis[];
}

export function RouteNetwork({ duties }: RouteNetworkProps) {
  // Extract unique routes
  const routes: { from: string; to: string; count: number }[] = [];
  
  duties.forEach((duty) => {
    duty.flightSegments.forEach((segment) => {
      const existingRoute = routes.find(
        (r) => r.from === segment.departure && r.to === segment.arrival
      );
      if (existingRoute) {
        existingRoute.count++;
      } else {
        routes.push({ from: segment.departure, to: segment.arrival, count: 1 });
      }
    });
  });

  // Get unique airports
  const airports = new Set<string>();
  routes.forEach((r) => {
    airports.add(r.from);
    airports.add(r.to);
  });

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Route Network Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-lg bg-secondary/30 p-6">
          {/* Simple route visualization */}
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from(airports).map((airport) => (
              <div
                key={airport}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-2 ring-primary/30"
              >
                {airport}
              </div>
            ))}
          </div>
          
          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-medium">Route Frequency</h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {routes.slice(0, 6).map((route, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-2 text-sm"
                >
                  <span className="font-mono">
                    {route.from} → {route.to}
                  </span>
                  <span className="text-muted-foreground">×{route.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            {airports.size} airports • {routes.length} unique routes
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
