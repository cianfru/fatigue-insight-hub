import { AlertTriangle, Plane, AlertCircle, Clock, Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DutyStatistics } from '@/types/fatigue';

interface StatisticsCardsProps {
  statistics: DutyStatistics;
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  // Format hours as HH:MM, handling edge cases like negative or invalid values
  const formatHoursMinutes = (hours: number): string => {
    if (!Number.isFinite(hours) || hours < 0) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const stats = [
    {
      label: 'Total Duties',
      value: statistics.totalDuties,
      icon: Plane,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Sectors',
      value: statistics.totalSectors,
      icon: Plane,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Duty Hours',
      value: formatHoursMinutes(statistics.totalDutyHours),
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Block Hours',
      value: formatHoursMinutes(statistics.totalBlockHours),
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'High Risk Duties',
      value: statistics.highRiskDuties,
      subtext: `${statistics.highRiskDuties} duties`,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Critical Risk',
      value: statistics.criticalRiskDuties,
      subtext: `${statistics.criticalRiskDuties} duties`,
      icon: AlertCircle,
      color: 'text-critical',
      bgColor: 'bg-critical/10',
    },
    {
      label: 'Max Sleep Debt',
      value: `${statistics.maxSleepDebt.toFixed(1)}h`,
      subtext: `${statistics.maxSleepDebt.toFixed(1)}h`,
      icon: Clock,
      color: 'text-critical',
      bgColor: 'bg-critical/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
      {stats.map((stat, index) => (
        <Card 
          key={stat.label} 
          variant="glass" 
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                {stat.subtext && (
                  <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                )}
              </div>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
