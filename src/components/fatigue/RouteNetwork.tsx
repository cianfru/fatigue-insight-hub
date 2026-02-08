import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DutyAnalysis } from '@/types/fatigue';
import { Globe, Plane, MapPin, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Line, Marker, ZoomableGroup } from 'react-simple-maps';
import { AirportData } from '@/data/airportCoordinates';
import { getMultipleAirportsAsync, getAirportFromCache } from '@/lib/airport-api';
import { useState, useMemo, useEffect } from 'react';

interface RegionPreset {
  name: string;
  center: [number, number];
  zoom: number;
}

const regionPresets: RegionPreset[] = [
  { name: 'World', center: [40, 25], zoom: 1 },
  { name: 'Europe', center: [10, 50], zoom: 3.5 },
  { name: 'Middle East', center: [50, 28], zoom: 3.5 },
  { name: 'Asia', center: [100, 30], zoom: 2.5 },
  { name: 'Americas', center: [-80, 35], zoom: 2 },
];

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
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [40, 25],
    zoom: 1,
  });
  const [activeRegion, setActiveRegion] = useState('World');

  const handleZoomIn = () => {
    if (position.zoom >= 8) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  };

  const handleRegionSelect = (preset: RegionPreset) => {
    setPosition({ coordinates: preset.center, zoom: preset.zoom });
    setActiveRegion(preset.name);
  };

  const handleReset = () => {
    setPosition({ coordinates: [40, 25], zoom: 1 });
    setActiveRegion('World');
  };

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

  // Collect all unique airport codes
  const allCodes = useMemo(() => {
    const airportSet = new Set<string>();
    routes.forEach((r) => {
      airportSet.add(r.from);
      airportSet.add(r.to);
    });
    return Array.from(airportSet);
  }, [routes]);

  // Fetch all airports from backend
  const [airports, setAirports] = useState<AirportData[]>([]);
  useEffect(() => {
    if (allCodes.length === 0) return;
    getMultipleAirportsAsync(allCodes).then(map => {
      setAirports(Array.from(map.values()));
    });
  }, [allCodes]);

  // Build route lines from cached data (available after fetch above)
  const routeLines = useMemo(() => {
    return routes
      .map(route => {
        const from = getAirportFromCache(route.from);
        const to = getAirportFromCache(route.to);
        if (!from || !to) return null;
        return {
          ...route,
          fromCoords: [from.lng, from.lat] as [number, number],
          toCoords: [to.lng, to.lat] as [number, number],
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [routes, airports]); // airports dependency ensures re-computation after fetch

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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Route Network Analysis
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Region Presets */}
          <div className="flex gap-1">
            {regionPresets.map((preset) => (
              <Button
                key={preset.name}
                variant={activeRegion === preset.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRegionSelect(preset)}
                className="text-xs px-2 py-1 h-7"
              >
                {preset.name}
              </Button>
            ))}
          </div>
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 ml-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-lg bg-secondary/20">
          {/* Map Visualization */}
          <div className="relative h-[400px]">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 120,
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <ZoomableGroup
                zoom={position.zoom}
                center={position.coordinates}
                onMoveEnd={handleMoveEnd}
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
              </ZoomableGroup>
            </ComposableMap>

            {/* Zoom Level Indicator */}
            <div className="absolute top-2 left-2 rounded-md bg-card/80 px-2 py-1 text-xs backdrop-blur-sm">
              Zoom: {position.zoom.toFixed(1)}x
            </div>
            {/* Hovered Airport Info */}
            {hoveredAirport && (
              <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-bold">{hoveredAirport}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getAirportFromCache(hoveredAirport)?.city}, {getAirportFromCache(hoveredAirport)?.country}
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
