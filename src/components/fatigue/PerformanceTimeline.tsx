import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DutyAnalysis } from '@/types/fatigue';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

interface PerformanceTimelineProps {
  duties: DutyAnalysis[];
}

export function PerformanceTimeline({ duties }: PerformanceTimelineProps) {
  const chartData = duties.map((duty) => ({
    date: format(duty.date, 'MMM dd'),
    minPerformance: duty.minPerformance,
    avgPerformance: duty.avgPerformance,
    landingPerformance: duty.landingPerformance,
  }));

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Performance Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--critical))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--critical))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[40, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <ReferenceLine
                y={50}
                stroke="hsl(var(--critical))"
                strokeDasharray="3 3"
                label={{ value: 'Critical', fill: 'hsl(var(--critical))', fontSize: 10 }}
              />
              <ReferenceLine
                y={70}
                stroke="hsl(var(--success))"
                strokeDasharray="3 3"
                label={{ value: 'Safe', fill: 'hsl(var(--success))', fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="minPerformance"
                stroke="hsl(var(--critical))"
                fillOpacity={1}
                fill="url(#colorMin)"
                strokeWidth={2}
                name="Min Performance"
              />
              <Area
                type="monotone"
                dataKey="avgPerformance"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorAvg)"
                strokeWidth={2}
                name="Avg Performance"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-xs">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-critical" />
            Min Performance
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-primary" />
            Avg Performance
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
