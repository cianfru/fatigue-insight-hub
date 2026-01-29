import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DutyAnalysis } from '@/types/fatigue';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

interface PerformanceTimelineProps {
  duties: DutyAnalysis[];
  month: Date;
}

export function PerformanceTimeline({ duties, month }: PerformanceTimelineProps) {
  // Generate all days of the month
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create chart data with recovery simulation using strategic sleep estimator data
  const chartData = allDays.map((day, index) => {
    const duty = duties.find(d => isSameDay(d.date, day));
    
    if (duty) {
      // Use strategic sleep estimator data if available
      const sleepEstimate = duty.sleepEstimate;
      const recoveryScore = sleepEstimate 
        ? Math.min(100, (sleepEstimate.effectiveSleepHours / 8) * 100 * sleepEstimate.sleepEfficiency)
        : null;
      
      return {
        date: format(day, 'dd'),
        fullDate: format(day, 'MMM dd'),
        minPerformance: duty.minPerformance,
        avgPerformance: duty.avgPerformance,
        recoveryScore,
        effectiveSleep: sleepEstimate?.effectiveSleepHours,
        sleepEfficiency: sleepEstimate?.sleepEfficiency,
        sleepStrategy: sleepEstimate?.sleepStrategy,
        isDuty: true,
        dutyType: 'flight',
      };
    } else {
      // Find the most recent duty before this day
      const previousDuties = duties.filter(d => d.date < day);
      const lastDuty = previousDuties.length > 0 
        ? previousDuties.reduce((a, b) => a.date > b.date ? a : b)
        : null;
      
      // Calculate days since last duty
      const daysSinceLastDuty = lastDuty 
        ? Math.floor((day.getTime() - lastDuty.date.getTime()) / (1000 * 60 * 60 * 24))
        : 5;
      
      // Use sleep estimate data for more accurate recovery modeling
      const lastSleepEstimate = lastDuty?.sleepEstimate;
      const baseSleepEfficiency = lastSleepEstimate?.sleepEfficiency || 0.8;
      
      // Recovery model enhanced with strategic sleep data
      // Better sleep efficiency = faster recovery
      const baseRecovery = lastDuty ? lastDuty.avgPerformance : 85;
      const recoveryRate = 6 + (baseSleepEfficiency * 4); // 6-10% per day based on sleep quality
      const recoveredPerformance = Math.min(95, baseRecovery + (daysSinceLastDuty * recoveryRate));
      const minRecovered = Math.min(92, (lastDuty?.minPerformance || 80) + (daysSinceLastDuty * recoveryRate));
      
      // Recovery score improves with rest days
      const recoveryScore = Math.min(100, 60 + (daysSinceLastDuty * 10));
      
      return {
        date: format(day, 'dd'),
        fullDate: format(day, 'MMM dd'),
        minPerformance: minRecovered,
        avgPerformance: recoveredPerformance,
        recoveryScore,
        effectiveSleep: 7 + Math.min(1, daysSinceLastDuty * 0.2), // Estimate ~7-8h for rest days
        sleepEfficiency: Math.min(0.95, 0.8 + daysSinceLastDuty * 0.03),
        sleepStrategy: 'recovery' as const,
        isDuty: false,
        dutyType: 'rest',
      };
    }
  });

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'anchor': return '⚓ Anchor Sleep';
      case 'split': return '✂️ Split Sleep';
      case 'nap': return '💤 Nap Strategy';
      case 'extended': return '🛏️ Extended Rest';
      case 'restricted': return '⏰ Restricted';
      case 'recovery': return '🔋 Recovery';
      default: return '😴 Normal Sleep';
    }
  };

  const CustomTooltip = forwardRef<HTMLDivElement, any>(({ active, payload }: any, ref) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div ref={ref} className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.fullDate}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {data.isDuty ? '✈️ Flight Duty' : '🛏️ Rest Day'}
          </p>
          <div className="space-y-1">
            <p className="text-xs">
              <span className="text-muted-foreground">Avg Performance: </span>
              <span className="font-medium text-primary">{data.avgPerformance.toFixed(1)}%</span>
            </p>
            <p className="text-xs">
              <span className="text-muted-foreground">Min Performance: </span>
              <span className="font-medium text-critical">{data.minPerformance.toFixed(1)}%</span>
            </p>
            {data.recoveryScore !== null && (
              <>
                <div className="border-t border-border/50 my-1.5 pt-1.5">
                  <p className="text-xs font-medium text-success">
                    🔋 Recovery Score: {data.recoveryScore.toFixed(0)}%
                  </p>
                </div>
                {data.effectiveSleep && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Effective Sleep: </span>
                    <span className="font-medium">{data.effectiveSleep.toFixed(1)}h</span>
                  </p>
                )}
                {data.sleepEfficiency && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Sleep Efficiency: </span>
                    <span className="font-medium">{(data.sleepEfficiency * 100).toFixed(0)}%</span>
                  </p>
                )}
                {data.sleepStrategy && (
                  <p className="text-xs text-muted-foreground">
                    {getStrategyLabel(data.sleepStrategy)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  });
  CustomTooltip.displayName = 'PerformanceTimelineTooltip';

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Performance Timeline - {format(month, 'MMMM yyyy')}</span>
          <div className="flex items-center gap-4 text-xs font-normal">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Flight Days
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success/50" />
              Rest/Recovery
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--critical))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--critical))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
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
                interval={0}
              />
              <YAxis
                domain={[40, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                ticks={[40, 50, 60, 70, 80, 90, 100]}
              />
               <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={50}
                stroke="hsl(var(--critical))"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={70}
                stroke="hsl(var(--success))"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="minPerformance"
                stroke="hsl(var(--critical))"
                fillOpacity={1}
                fill="url(#colorMin)"
                strokeWidth={2}
                name="Min Performance"
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.isDuty) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="hsl(var(--critical))"
                        stroke="hsl(var(--background))"
                        strokeWidth={1}
                      />
                    );
                  }
                  return <circle cx={cx} cy={cy} r={0} />;
                }}
              />
              <Area
                type="monotone"
                dataKey="avgPerformance"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorAvg)"
                strokeWidth={2}
                name="Avg Performance"
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
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-critical" />
              Min Performance
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-primary" />
              Avg Performance
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="h-px w-4 border-t-2 border-dashed border-critical" />
              Critical (50%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-px w-4 border-t-2 border-dashed border-success" />
              Safe (70%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
