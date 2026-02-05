import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DutyAnalysis } from '@/types/fatigue';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Clock } from 'lucide-react';
import { airportCoordinates } from '@/data/airportCoordinates';

interface BodyClockDriftChartProps {
  duties: DutyAnalysis[];
  month: Date;
  homeBase: string;
}

// Estimate timezone offset from longitude (rough approximation)
const getTimezoneFromLongitude = (lng: number): number => {
  return Math.round(lng / 15); // Each 15° = 1 hour
};

// Get airport timezone offset relative to home base
const getAirportOffset = (code: string, homeBaseLng: number): number => {
  const airport = airportCoordinates[code];
  if (!airport) return 0;
  
  const homeOffset = getTimezoneFromLongitude(homeBaseLng);
  const destOffset = getTimezoneFromLongitude(airport.lng);
  return destOffset - homeOffset;
};

export function BodyClockDriftChart({ duties, month, homeBase }: BodyClockDriftChartProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get home base longitude for reference
  const homeAirport = airportCoordinates[homeBase];
  const homeBaseLng = homeAirport?.lng || 51.6; // Default to DOH

  // Build chart data with actual east-west movement tracking
  let lastPhaseShift = 0;
  let cumulativeShift = 0;
  const adaptationRateEast = 1.0; // Hours per day eastward adaptation
  const adaptationRateWest = 1.5; // Hours per day westward adaptation
  let lastDestination: string | null = null;

  const chartData = allDays.map((day) => {
    const duty = duties.find(d => isSameDay(d.date, day));
    
    if (duty && duty.flightSegments && duty.flightSegments.length > 0) {
      // Get the final destination of this duty
      const lastSeg = duty.flightSegments[duty.flightSegments.length - 1];
      const destination = lastSeg.arrival;
      
      if (destination && destination !== homeBase) {
        // Calculate timezone shift from home base to destination
        const tzShift = getAirportOffset(destination, homeBaseLng);
        
        // If we have circadianPhaseShift from backend, use it
        if (duty.circadianPhaseShift !== undefined && duty.circadianPhaseShift !== 0) {
          cumulativeShift = duty.circadianPhaseShift;
        } else {
          // Otherwise calculate from destination
          cumulativeShift = tzShift;
        }
        lastDestination = destination;
      } else if (destination === homeBase) {
        // Returning home - body clock still needs time to adapt
        // Keep the shift but it will decay
        lastDestination = homeBase;
      }
      
      lastPhaseShift = cumulativeShift;
    } else {
      // Rest day - gradual adaptation toward home base (0)
      if (cumulativeShift > 0) {
        // Eastward shift - adapt at ~1h/day
        cumulativeShift = Math.max(0, cumulativeShift - adaptationRateEast);
      } else if (cumulativeShift < 0) {
        // Westward shift - adapt at ~1.5h/day
        cumulativeShift = Math.min(0, cumulativeShift + adaptationRateWest);
      }
      lastPhaseShift = cumulativeShift;
    }

    return {
      date: format(day, 'dd'),
      fullDate: format(day, 'MMM dd'),
      phaseShift: lastPhaseShift,
      eastShift: lastPhaseShift > 0 ? lastPhaseShift : 0,
      westShift: lastPhaseShift < 0 ? lastPhaseShift : 0,
      isDuty: !!duty,
      destination: duty?.flightSegments?.[duty.flightSegments.length - 1]?.arrival || lastDestination,
    };
  });

  const maxShift = Math.max(...chartData.map(d => Math.abs(d.phaseShift)), 8);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const shift = data.phaseShift;
      const direction = shift > 0 ? 'East' : shift < 0 ? 'West' : 'Aligned';
      
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.fullDate}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {data.isDuty ? '✈️ Flight Duty' : '🏠 Rest Day'}
            {data.destination && ` → ${data.destination}`}
          </p>
          <div className="space-y-1">
            <p className="text-xs">
              <span className="text-muted-foreground">Timezone Offset: </span>
              <span className={`font-medium ${
                Math.abs(shift) > 6 ? 'text-critical' :
                Math.abs(shift) > 3 ? 'text-warning' : 'text-success'
              }`}>
                {shift > 0 ? '+' : ''}{shift.toFixed(1)}h ({direction})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.abs(shift) > 8 ? '🚨 Severe jet lag risk' :
               Math.abs(shift) > 6 ? '⚠️ Significant jet lag' : 
               Math.abs(shift) > 3 ? '⚡ Moderate desync' : 
               '✅ Well-aligned'}
            </p>
            {Math.abs(shift) > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Recovery: ~{(Math.abs(shift) / (shift > 0 ? adaptationRateEast : adaptationRateWest)).toFixed(0)} days to home base
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Body Clock Drift - East/West Movement
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Home Base: {homeBase}
          </span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tracks timezone crossings relative to home base ({homeAirport?.city || homeBase})
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorWest" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                domain={[-maxShift, maxShift]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}h`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={0}
                stroke="hsl(120, 70%, 45%)"
                strokeWidth={2}
                label={{ value: homeBase, position: 'right', fontSize: 10, fill: 'hsl(120, 70%, 45%)' }}
              />
              <ReferenceLine
                y={6}
                stroke="hsl(30, 100%, 50%)"
                strokeDasharray="5 5"
                strokeWidth={1}
                label={{ value: '+6h East', position: 'left', fontSize: 9, fill: 'hsl(30, 100%, 50%)' }}
              />
              <ReferenceLine
                y={-6}
                stroke="hsl(210, 100%, 50%)"
                strokeDasharray="5 5"
                strokeWidth={1}
                label={{ value: '-6h West', position: 'left', fontSize: 9, fill: 'hsl(210, 100%, 50%)' }}
              />
              {/* East (positive) area */}
              <Area
                type="monotone"
                dataKey="eastShift"
                stroke="hsl(30, 100%, 50%)"
                fill="url(#colorEast)"
                strokeWidth={2}
                dot={false}
              />
              {/* West (negative) area */}
              <Area
                type="monotone"
                dataKey="westShift"
                stroke="hsl(210, 100%, 50%)"
                fill="url(#colorWest)"
                strokeWidth={2}
                dot={false}
              />
              {/* Combined line for clarity */}
              <Line
                type="monotone"
                dataKey="phaseShift"
                stroke="hsl(var(--foreground))"
                strokeWidth={1.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.isDuty) {
                    const color = payload.phaseShift > 0 ? 'hsl(30, 100%, 50%)' : 
                                  payload.phaseShift < 0 ? 'hsl(210, 100%, 50%)' : 
                                  'hsl(120, 70%, 45%)';
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={color}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle cx={cx} cy={cy} r={0} />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" />
              Home ({homeBase})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(30, 100%, 50%)' }} />
              East (+h)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(210, 100%, 50%)' }} />
              West (-h)
            </span>
          </div>
          <span>Adaptation rate: ~1h/day eastward, ~1.5h/day westward</span>
        </div>
      </CardContent>
    </Card>
  );
}
