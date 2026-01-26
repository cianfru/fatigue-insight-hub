import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DutyAnalysis } from '@/types/fatigue';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Clock } from 'lucide-react';

interface BodyClockDriftChartProps {
  duties: DutyAnalysis[];
  month: Date;
  homeBase: string;
}

export function BodyClockDriftChart({ duties, month, homeBase }: BodyClockDriftChartProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Build chart data with circadian phase shift interpolation
  let lastPhaseShift = 0;
  const adaptationRate = 1.0; // Hours per day toward home base

  const chartData = allDays.map((day) => {
    const duty = duties.find(d => isSameDay(d.date, day));
    
    if (duty && duty.circadianPhaseShift !== undefined) {
      lastPhaseShift = duty.circadianPhaseShift;
    } else {
      // Gradual adaptation back toward home base (0) on rest days
      if (lastPhaseShift > 0) {
        lastPhaseShift = Math.max(0, lastPhaseShift - adaptationRate);
      } else if (lastPhaseShift < 0) {
        lastPhaseShift = Math.min(0, lastPhaseShift + adaptationRate);
      }
    }

    return {
      date: format(day, 'dd'),
      fullDate: format(day, 'MMM dd'),
      phaseShift: lastPhaseShift,
      isDuty: !!duty,
      destination: duty?.flightSegments?.[duty.flightSegments.length - 1]?.arrival || null,
    };
  });

  const maxShift = Math.max(...chartData.map(d => Math.abs(d.phaseShift)), 6);

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
              <span className="text-muted-foreground">Body Clock: </span>
              <span className={`font-medium ${Math.abs(shift) > 3 ? 'text-warning' : 'text-success'}`}>
                {shift > 0 ? '+' : ''}{shift.toFixed(1)}h {direction}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.abs(shift) > 6 ? '⚠️ Significant jet lag' : 
               Math.abs(shift) > 3 ? '⚡ Moderate desync' : 
               '✅ Well-aligned'}
            </p>
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
            Body Clock Drift - Circadian Phase Adaptation
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Home Base: {homeBase}
          </span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Shows circadian rhythm phase shift relative to home base timezone
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDriftPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDriftNeg" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                stroke="hsl(var(--success))"
                strokeWidth={2}
                label={{ value: 'Home Base', position: 'right', fontSize: 10, fill: 'hsl(var(--success))' }}
              />
              <ReferenceLine
                y={6}
                stroke="hsl(var(--warning))"
                strokeDasharray="5 5"
                strokeWidth={1}
              />
              <ReferenceLine
                y={-6}
                stroke="hsl(var(--warning))"
                strokeDasharray="5 5"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="phaseShift"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorDriftPos)"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.isDuty) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="hsl(var(--primary))"
                        stroke="hsl(var(--background))"
                        strokeWidth={1}
                      />
                    );
                  }
                  return <circle cx={cx} cy={cy} r={0} />;
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" />
              Aligned (0h)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning" />
              East (+h)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              West (-h)
            </span>
          </div>
          <span>Adaptation rate: ~1h/day eastward, ~1.5h/day westward</span>
        </div>
      </CardContent>
    </Card>
  );
}
