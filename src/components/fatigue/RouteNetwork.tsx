import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DutyAnalysis } from '@/types/fatigue';
import { Globe, Plane, MapPin } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Line, Marker } from 'react-simple-maps';
import { airportCoordinates, getAirportCoordinates } from '@/data/airportCoordinates';
import { useState } from 'react';

interface RouteNetworkProps {
  duties: DutyAnalysis[];
  homeBase?: string;
}

interface RouteData {
  from: string;
  to: string;
  count: number;
  avgPerformance: number;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export function RouteNetwork({ duties, homeBase = 'DOH' }: RouteNetworkProps) {
  const [hoveredAirport, setHoveredAirport] = useState<string | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  // Extract unique routes with performance data
  const routeMap = new Map<string, RouteData>();
  
  duties.forEach((duty) => {
    duty.flightSegments.forEach((segment) => {
      const key = `${segment.departure}-${segment.arrival}`;
      const existing = routeMap.get(key);
      if (existing) {
        existing.count++;
        existing.avgPerformance = (existing.avgPerformance + segment.performance) / 2;
      } else {
        routeMap.set(key, { 
          from: segment.departure, 
          to: segment.arrival, 
          count: 1,
          avgPerformance: segment.performance
        });
      }
    });
  });

  const routes = Array.from(routeMap.values());

  // Get unique airports with coordinates
  const airportSet = new Set<string>();
  routes.forEach((r) => {
    airportSet.add(r.from);
    airportSet.add(r.to);
  });

  const airports = Array.from(airportSet)
    .map(code => getAirportCoordinates(code))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  // Get route lines with coordinates
  const routeLines = routes
    .map(route => {
      const from = getAirportCoordinates(route.from);
      const to = getAirportCoordinates(route.to);
      if (!from || !to) return null;
      return {
        ...route,
        fromCoords: [from.lng, from.lat] as [number, number],
        toCoords: [to.lng, to.lat] as [number, number],
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Get route color based on performance
  const getRouteColor = (performance: number) => {
    if (performance >= 70) return 'hsl(var(--success))';
    if (performance >= 60) return 'hsl(var(--warning))';
    if (performance >= 50) return 'hsl(var(--high))';
    return 'hsl(var(--critical))';
  };

  const getRouteOpacity = (routeKey: string) => {
    if (hoveredRoute === routeKey) return 0.9;
    if (hoveredRoute) return 0.2;
    return 0.6;
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Route Network Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-lg bg-secondary/20">
          {/* Map Visualization */}
          <div className="relative h-[400px]">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 120,
                center: [40, 25],
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="hsl(var(--secondary))"
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', fill: 'hsl(var(--muted))' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* Route Lines */}
              {routeLines.map((route) => {
                const routeKey = `${route.from}-${route.to}`;
                return (
                  <Line
                    key={routeKey}
                    from={route.fromCoords}
                    to={route.toCoords}
                    stroke={getRouteColor(route.avgPerformance)}
                    strokeWidth={Math.min(route.count + 1, 4)}
                    strokeOpacity={getRouteOpacity(routeKey)}
                    strokeLinecap="round"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredRoute(routeKey)}
                    onMouseLeave={() => setHoveredRoute(null)}
                  />
                );
              })}

              {/* Airport Markers */}
              {airports.map((airport) => {
                const isHomeBase = airport.code === homeBase;
                const isHovered = hoveredAirport === airport.code;
                
                return (
                  <Marker
                    key={airport.code}
                    coordinates={[airport.lng, airport.lat]}
                    onMouseEnter={() => setHoveredAirport(airport.code)}
                    onMouseLeave={() => setHoveredAirport(null)}
                  >
                    <circle
                      r={isHomeBase ? 6 : 4}
                      fill={isHomeBase ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                      }}
                    />
                    <text
                      textAnchor="middle"
                      y={isHomeBase ? -12 : -10}
                      style={{
                        fontFamily: 'system-ui',
                        fontSize: isHomeBase ? '11px' : '9px',
                        fontWeight: isHomeBase ? 700 : 500,
                        fill: isHomeBase ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                        pointerEvents: 'none',
                      }}
                    >
                      {airport.code}
                    </text>
                  </Marker>
                );
              })}
            </ComposableMap>

            {/* Hovered Airport Info */}
            {hoveredAirport && (
              <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-bold">{hoveredAirport}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getAirportCoordinates(hoveredAirport)?.city}, {getAirportCoordinates(hoveredAirport)?.country}
                </p>
              </div>
            )}

            {/* Hovered Route Info */}
            {hoveredRoute && (
              <div className="absolute bottom-4 right-4 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  <span className="font-mono font-bold">{hoveredRoute.replace('-', ' → ')}</span>
                </div>
                {routeLines.find(r => `${r.from}-${r.to}` === hoveredRoute) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span>Flights: {routeLines.find(r => `${r.from}-${r.to}` === hoveredRoute)?.count}</span>
                    <span className="mx-2">•</span>
                    <span>Avg Perf: {routeLines.find(r => `${r.from}-${r.to}` === hoveredRoute)?.avgPerformance.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Route Frequency Table */}
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium">Route Frequency</h4>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Safe (&gt;70%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-high" />
                  High
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-critical" />
                  Critical
                </span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {routes.map((route, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-2 text-sm transition-colors hover:bg-secondary/70"
                  onMouseEnter={() => setHoveredRoute(`${route.from}-${route.to}`)}
                  onMouseLeave={() => setHoveredRoute(null)}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: getRouteColor(route.avgPerformance) }}
                    />
                    <span className="font-mono">
                      {route.from} → {route.to}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>×{route.count}</span>
                    <span className="text-[10px]">({route.avgPerformance.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              <MapPin className="mr-1 inline-block h-3 w-3" />
              {airports.length} airports • {routes.length} unique routes • Home base: {homeBase}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
